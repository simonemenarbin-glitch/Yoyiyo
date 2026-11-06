import { createHash } from "crypto";
import type { ChannelConnection, LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FetchedInbound } from "./imap-fetch";
import { isNoiseMessage } from "./noise";

/**
 * Canali non-IMAP: leggono messaggi già accodati (webhook / import manuale)
 * con status FETCHED ancora da processare non serve — qui prendiamo
 * dalla configJson.pending[] oppure record IngestedMessage ancora FETCHED
 * senza lead, creati da webhook.
 */
export async function fetchQueuedChannelMessages(
  connection: ChannelConnection,
): Promise<FetchedInbound[]> {
  const pendingFromConfig: FetchedInbound[] = [];
  if (connection.configJson) {
    try {
      const cfg = JSON.parse(connection.configJson) as {
        pending?: {
          externalId?: string;
          fromName?: string;
          fromAddress?: string;
          subject?: string;
          text: string;
          receivedAt?: string;
        }[];
      };
      for (const item of cfg.pending || []) {
        const externalId =
          item.externalId ||
          `${connection.id}:${createHash("sha1").update(item.text).digest("hex").slice(0, 12)}`;
        const fp = createHash("sha256")
          .update(`${connection.id}|${externalId}|${item.text.slice(0, 200)}`)
          .digest("hex")
          .slice(0, 40);
        if (isNoiseMessage({ from: item.fromAddress, subject: item.subject, text: item.text })) {
          pendingFromConfig.push({
            externalId,
            fingerprint: fp,
            fromName: item.fromName || null,
            fromAddress: item.fromAddress || null,
            subject: item.subject || null,
            receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
            rawText: item.text,
            skipReason: "Filtro rumore",
          });
          continue;
        }
        pendingFromConfig.push({
          externalId,
          fingerprint: fp,
          fromName: item.fromName || null,
          fromAddress: item.fromAddress || null,
          subject: item.subject || null,
          receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
          rawText: formatChannelRaw(connection.source, item),
        });
      }
    } catch {
      // ignore bad json
    }
  }

  // Drain queued IngestedMessage without lead (webhook arrivals)
  const queued = await prisma.ingestedMessage.findMany({
    where: {
      organizationId: connection.organizationId,
      connectionId: connection.id,
      status: "FETCHED",
      leadId: null,
    },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  const fromDb: FetchedInbound[] = queued.map((m) => ({
    externalId: m.externalId,
    fingerprint: m.fingerprint,
    fromName: m.fromName,
    fromAddress: m.fromAddress,
    subject: m.subject,
    receivedAt: m.receivedAt,
    rawText: m.rawText,
  }));

  return [...pendingFromConfig, ...fromDb];
}

function formatChannelRaw(
  source: LeadSource,
  item: {
    fromName?: string;
    fromAddress?: string;
    subject?: string;
    text: string;
  },
) {
  const header =
    source === "WHATSAPP"
      ? `From: ${item.fromName || "WhatsApp"} <${item.fromAddress || "whatsapp"}>`
      : source === "INSTAGRAM"
        ? `From: ${item.fromName || "Instagram"} <${item.fromAddress || "instagram"}>`
        : source === "FACEBOOK"
          ? `From: ${item.fromName || "Facebook"} <${item.fromAddress || "facebook"}>`
          : `From: ${item.fromName || ""} <${item.fromAddress || ""}>`;
  return [header, item.subject ? `Subject: ${item.subject}` : null, "", item.text]
    .filter(Boolean)
    .join("\n");
}

/** Svuota pending dalla config dopo sync riuscito. */
export async function clearConnectionPending(connectionId: string) {
  const conn = await prisma.channelConnection.findUnique({ where: { id: connectionId } });
  if (!conn?.configJson) return;
  try {
    const cfg = JSON.parse(conn.configJson) as Record<string, unknown>;
    cfg.pending = [];
    await prisma.channelConnection.update({
      where: { id: connectionId },
      data: { configJson: JSON.stringify(cfg) },
    });
  } catch {
    // ignore
  }
}
