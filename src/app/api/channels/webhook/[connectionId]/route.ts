import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fp(connectionId: string, externalId: string, text: string) {
  return createHash("sha256")
    .update(`${connectionId}|${externalId}|${text.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 40);
}

/** Meta webhook verification (GET). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await ctx.params;
  const conn = await prisma.channelConnection.findUnique({ where: { id: connectionId } });
  if (!conn) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  let expected = "rotta-verify";
  try {
    expected = (JSON.parse(conn.configJson || "{}") as { verifyToken?: string }).verifyToken || expected;
  } catch {
    // ignore
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: true, connectionId });
}

/** Ingest WhatsApp / IG / FB / web form payloads (POST). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await ctx.params;
  const conn = await prisma.channelConnection.findUnique({ where: { id: connectionId } });
  if (!conn || !conn.enabled) {
    return NextResponse.json({ error: "disabled or missing" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const items: {
    externalId: string;
    fromName?: string;
    fromAddress?: string;
    subject?: string;
    text: string;
  }[] = [];

  // Generic shape
  if (typeof body.text === "string") {
    items.push({
      externalId: String(body.id || body.externalId || `hook-${Date.now()}`),
      fromName: body.fromName,
      fromAddress: body.from || body.fromAddress,
      subject: body.subject,
      text: body.text,
    });
  }

  // WhatsApp Cloud-ish
  const waMessages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (Array.isArray(waMessages)) {
    for (const m of waMessages) {
      items.push({
        externalId: String(m.id || `wa-${Date.now()}`),
        fromAddress: m.from,
        fromName: m.from,
        subject: "WhatsApp",
        text: m.text?.body || m.button?.text || JSON.stringify(m),
      });
    }
  }

  // Web form array
  if (Array.isArray(body.messages)) {
    for (const m of body.messages) {
      items.push({
        externalId: String(m.id || m.externalId || `msg-${Date.now()}`),
        fromName: m.fromName,
        fromAddress: m.from || m.fromAddress,
        subject: m.subject,
        text: m.text || m.body || "",
      });
    }
  }

  if (!items.length) {
    return NextResponse.json({ ok: true, ingested: 0 });
  }

  let ingested = 0;
  for (const item of items) {
    if (!item.text?.trim()) continue;
    const fingerprint = fp(connectionId, item.externalId, item.text);
    const rawText = [
      `From: ${item.fromName || ""} <${item.fromAddress || ""}>`,
      item.subject ? `Subject: ${item.subject}` : null,
      "",
      item.text,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await prisma.ingestedMessage.create({
        data: {
          organizationId: conn.organizationId,
          connectionId: conn.id,
          source: conn.source,
          externalId: item.externalId,
          fingerprint,
          fromName: item.fromName || null,
          fromAddress: item.fromAddress || null,
          subject: item.subject || null,
          receivedAt: new Date(),
          rawText,
          status: "FETCHED",
        },
      });
      ingested += 1;
    } catch {
      // duplicate fingerprint
    }
  }

  return NextResponse.json({ ok: true, ingested });
}
