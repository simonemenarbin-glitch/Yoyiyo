import type { ChannelConnection, LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processInboundMessage } from "@/lib/intake/process-inbound";
import { fetchImapMessages, type FetchedInbound } from "./imap-fetch";
import { clearConnectionPending, fetchQueuedChannelMessages } from "./queue-fetch";

export type SyncChannelResult = {
  connectionId: string;
  label: string;
  source: LeadSource;
  fetched: number;
  createdLeads: number;
  quotes: number;
  drafts: number;
  skipped: number;
  errors: string[];
  leadIds: string[];
  quoteIds: string[];
};

async function fetchForConnection(conn: ChannelConnection): Promise<FetchedInbound[]> {
  if (conn.kind === "IMAP") {
    if (!conn.host || !conn.username || !conn.secret) {
      throw new Error("IMAP incompleto: host / utente / password");
    }
    return fetchImapMessages({
      host: conn.host,
      port: conn.port || 993,
      username: conn.username,
      password: conn.secret,
      mailbox: conn.mailbox || "INBOX",
      lookbackDays: conn.lookbackDays || 3,
      limit: 40,
    });
  }
  return fetchQueuedChannelMessages(conn);
}

export async function syncOrganizationChannels(input: {
  organizationId: string;
  userId?: string | null;
  connectionIds?: string[];
  autoQuote?: boolean;
}): Promise<SyncChannelResult[]> {
  const connections = await prisma.channelConnection.findMany({
    where: {
      organizationId: input.organizationId,
      enabled: true,
      ...(input.connectionIds?.length ? { id: { in: input.connectionIds } } : {}),
    },
    orderBy: { label: "asc" },
  });

  const results: SyncChannelResult[] = [];

  for (const conn of connections) {
    const result: SyncChannelResult = {
      connectionId: conn.id,
      label: conn.label,
      source: conn.source,
      fetched: 0,
      createdLeads: 0,
      quotes: 0,
      drafts: 0,
      skipped: 0,
      errors: [],
      leadIds: [],
      quoteIds: [],
    };

    try {
      const messages = await fetchForConnection(conn);
      result.fetched = messages.length;

      for (const msg of messages) {
        const existing = await prisma.ingestedMessage.findUnique({
          where: {
            organizationId_fingerprint: {
              organizationId: input.organizationId,
              fingerprint: msg.fingerprint,
            },
          },
        });
        if (existing?.leadId || existing?.status === "PROCESSED" || existing?.status === "SKIPPED") {
          result.skipped += 1;
          continue;
        }

        if (msg.skipReason) {
          await prisma.ingestedMessage.upsert({
            where: {
              organizationId_fingerprint: {
                organizationId: input.organizationId,
                fingerprint: msg.fingerprint,
              },
            },
            create: {
              organizationId: input.organizationId,
              connectionId: conn.id,
              source: conn.source,
              externalId: msg.externalId,
              fingerprint: msg.fingerprint,
              fromName: msg.fromName,
              fromAddress: msg.fromAddress,
              subject: msg.subject,
              receivedAt: msg.receivedAt,
              rawText: msg.rawText,
              status: "SKIPPED",
              errorText: msg.skipReason,
            },
            update: {
              status: "SKIPPED",
              errorText: msg.skipReason,
            },
          });
          result.skipped += 1;
          continue;
        }

        // Already FETCHED from webhook without lead → process it
        let ingestId = existing?.id;
        if (!ingestId) {
          const created = await prisma.ingestedMessage.create({
            data: {
              organizationId: input.organizationId,
              connectionId: conn.id,
              source: conn.source,
              externalId: msg.externalId,
              fingerprint: msg.fingerprint,
              fromName: msg.fromName,
              fromAddress: msg.fromAddress,
              subject: msg.subject,
              receivedAt: msg.receivedAt,
              rawText: msg.rawText,
              status: "FETCHED",
            },
          });
          ingestId = created.id;
        }

        try {
          const processed = await processInboundMessage({
            organizationId: input.organizationId,
            userId: input.userId,
            source: conn.source,
            sourceDetail: `${conn.label}${msg.subject ? ` · ${msg.subject}` : ""}`,
            rawText: msg.rawText,
            autoQuote: input.autoQuote !== false,
            connectionId: conn.id,
            channelKind: conn.kind,
            fromAddress: msg.fromAddress,
            subject: msg.subject,
            ingestedId: ingestId,
            receivedAt: msg.receivedAt,
          });

          await prisma.ingestedMessage.update({
            where: { id: ingestId },
            data: {
              status: "PROCESSED",
              leadId: processed.leadId,
              quoteId: processed.quoteId,
            },
          });

          result.createdLeads += 1;
          result.leadIds.push(processed.leadId);
          if (processed.quoteId) {
            result.quotes += 1;
            result.quoteIds.push(processed.quoteId);
          } else if (processed.decision === "NEEDS_INFO") {
            result.drafts += 1;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          result.errors.push(message);
          await prisma.ingestedMessage.update({
            where: { id: ingestId },
            data: { status: "ERROR", errorText: message },
          });
        }
      }

      if (conn.kind !== "IMAP") {
        await clearConnectionPending(conn.id);
      }

      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date(), lastError: result.errors[0] || null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date(), lastError: message },
      });
    }

    results.push(result);
  }

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      action: "CHANNEL_SYNC",
      entityType: "ChannelConnection",
      metaJson: JSON.stringify({
        connections: results.map((r) => ({
          label: r.label,
          leads: r.createdLeads,
          quotes: r.quotes,
          drafts: r.drafts,
          skipped: r.skipped,
          errors: r.errors.length,
        })),
      }),
    },
  });

  return results;
}
