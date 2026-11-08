import type { ChannelKind, PrismaClient } from "@prisma/client";
import { SANDBOX_INBOX_SAMPLES } from "./types";

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000);
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Lead",
    lastName: parts.slice(1).join(" ") || "Inbox",
  };
}

async function findOrCreateConnection(
  prisma: PrismaClient,
  orgId: string,
  sample: (typeof SANDBOX_INBOX_SAMPLES)[number],
) {
  const label = `Sandbox ${sample.source} ${sample.kind}`;
  const existing = await prisma.channelConnection.findFirst({
    where: { organizationId: orgId, label },
  });
  if (existing) {
    if (!existing.enabled) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: { enabled: true, lastError: null },
      });
    }
    return existing;
  }
  return prisma.channelConnection.create({
    data: {
      organizationId: orgId,
      label,
      source: sample.source,
      kind: sample.channelKind as ChannelKind,
      enabled: true,
      configJson: JSON.stringify({ mode: "sandbox", note: "Nessuna chiave live" }),
    },
  });
}

async function findOrCreateLead(
  prisma: PrismaClient,
  orgId: string,
  sample: (typeof SANDBOX_INBOX_SAMPLES)[number],
  brandId: string | null,
) {
  const handle = sample.contactHandle;
  const emailCandidate =
    sample.source === "EMAIL" || sample.source === "WEB" || (handle.includes("@") && !handle.startsWith("@"))
      ? handle.replace(/^@/, "")
      : null;
  const phoneCandidate =
    sample.source === "WHATSAPP" || handle.startsWith("+") ? handle : null;

  const or: Array<{ email?: string; phone?: string; sourceDetail?: { contains: string } }> = [
    { sourceDetail: { contains: handle } },
  ];
  if (emailCandidate) or.push({ email: emailCandidate });
  if (phoneCandidate) or.push({ phone: phoneCandidate });

  const existing = await prisma.lead.findFirst({
    where: { organizationId: orgId, OR: or },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;

  const { firstName, lastName } = splitName(sample.contactName);

  return prisma.lead.create({
    data: {
      organizationId: orgId,
      brandId,
      firstName,
      lastName,
      email: emailCandidate,
      phone: phoneCandidate,
      source: sample.source,
      sourceDetail: `inbox sandbox · ${sample.kind} · ${handle}`,
      pipelineStage: "NEW",
      intakeStatus: "NEEDS_INFO",
      clientType: "B2C",
      pipelineName: sample.kind === "COMMENT" ? "Social commenti" : "Inbox unificata",
      interest: sample.subject,
      rawSourceText: sample.messages.map((m) => m.body).join("\n\n"),
      draftReply: `Buongiorno ${firstName},\n\ngrazie per il messaggio. Vi rispondiamo a breve con una prima ipotesi.\n\nUfficio Booking / Yoyiyo`,
      notes: `Creato da inbox sandbox (${sample.kind})`,
      lastActivityAt: new Date(),
    },
  });
}

export type SandboxSyncResult = {
  threadsUpserted: number;
  messagesCreated: number;
  leadsCreated: number;
};

/**
 * Idempotent sandbox ingest: upserts threads by externalThreadId,
 * creates missing ConversationMessage rows, links CRM leads.
 */
export async function syncSandboxInbox(
  prisma: PrismaClient,
  orgId: string,
): Promise<SandboxSyncResult> {
  const brand = await prisma.brand.findFirst({
    where: { organizationId: orgId, slug: "yoyiyo" },
  });
  const brandId = brand?.id ?? null;

  let threadsUpserted = 0;
  let messagesCreated = 0;
  let leadsCreated = 0;

  for (const sample of SANDBOX_INBOX_SAMPLES) {
    const connection = await findOrCreateConnection(prisma, orgId, sample);
    const leadsBefore = await prisma.lead.count({ where: { organizationId: orgId } });
    const lead = await findOrCreateLead(prisma, orgId, sample, brandId);
    const leadsAfter = await prisma.lead.count({ where: { organizationId: orgId } });
    if (leadsAfter > leadsBefore) leadsCreated += 1;

    const lastMsg = sample.messages.reduce((a, b) =>
      a.minutesAgo < b.minutesAgo ? a : b,
    );
    const unreadIn = sample.messages.filter((m) => m.direction === "IN").length;

    const thread = await prisma.inboxThread.upsert({
      where: {
        organizationId_externalThreadId: {
          organizationId: orgId,
          externalThreadId: sample.externalThreadId,
        },
      },
      create: {
        organizationId: orgId,
        connectionId: connection.id,
        leadId: lead.id,
        brandId,
        source: sample.source,
        kind: sample.kind,
        status: "OPEN",
        externalThreadId: sample.externalThreadId,
        contactName: sample.contactName,
        contactHandle: sample.contactHandle,
        subject: sample.subject,
        lastBody: lastMsg.body.slice(0, 280),
        lastAt: minutesAgo(lastMsg.minutesAgo),
        unreadCount: unreadIn,
        permalink: sample.permalink || null,
      },
      update: {
        connectionId: connection.id,
        leadId: lead.id,
        brandId,
        contactName: sample.contactName,
        contactHandle: sample.contactHandle,
        subject: sample.subject,
        lastBody: lastMsg.body.slice(0, 280),
        lastAt: minutesAgo(lastMsg.minutesAgo),
        permalink: sample.permalink || null,
        status: "OPEN",
      },
    });
    threadsUpserted += 1;

    for (const msg of sample.messages) {
      const exists = await prisma.conversationMessage.findFirst({
        where: {
          organizationId: orgId,
          externalId: msg.externalId,
        },
      });
      if (exists) continue;

      await prisma.conversationMessage.create({
        data: {
          organizationId: orgId,
          leadId: lead.id,
          threadId: thread.id,
          connectionId: connection.id,
          direction: msg.direction,
          source: sample.source,
          channelKind: sample.channelKind as ChannelKind,
          kind: sample.kind,
          status: "LOGGED",
          unread: msg.direction === "IN",
          fromAddress: msg.direction === "IN" ? sample.contactHandle : "sandbox@rotta.erp",
          toAddress: msg.direction === "OUT" ? sample.contactHandle : "sandbox@rotta.erp",
          subject: sample.subject,
          body: msg.body,
          externalId: msg.externalId,
          permalink: sample.permalink || null,
          sentAt: minutesAgo(msg.minutesAgo),
          createdAt: minutesAgo(msg.minutesAgo),
        },
      });
      messagesCreated += 1;
    }

    const unreadCount = await prisma.conversationMessage.count({
      where: { threadId: thread.id, unread: true, direction: "IN" },
    });
    await prisma.inboxThread.update({
      where: { id: thread.id },
      data: { unreadCount },
    });
  }

  return { threadsUpserted, messagesCreated, leadsCreated };
}
