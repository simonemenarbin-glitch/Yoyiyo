import type { InboxThread, Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildBaseQuoteForLead } from "@/lib/intake/process-inbound";
import { evaluateIntake } from "@/lib/intake/evaluate";
import { parseLeadSource } from "@/lib/intake/parse-source";
import { leadSourceLabel } from "@/lib/labels";

export type CommercialAiResult = {
  leadId: string;
  quoteId: string | null;
  decision: "READY_TO_QUOTE" | "NEEDS_INFO";
  missing: string[];
  pipelineStage: string;
  intakeStatus: string;
};

/**
 * AI commerciale offline: legge il thread inbox, aggiorna lead/pipeline,
 * genera preventivo base se i dati bastano, altrimenti bozza richiesta campi.
 */
export async function runCommercialAiOnLeadThread(input: {
  organizationId: string;
  userId?: string | null;
  threadId: string;
  autoQuote?: boolean;
}): Promise<CommercialAiResult | null> {
  const thread = await prisma.inboxThread.findFirst({
    where: { id: input.threadId, organizationId: input.organizationId },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread?.lead) return null;

  const inboundText = thread.messages
    .filter((m) => m.direction === "IN")
    .map((m) => m.body)
    .join("\n\n");
  const rawText =
    inboundText ||
    thread.lead.rawSourceText ||
    `${thread.subject || ""}\n${thread.lastBody || ""}`;

  const parsed = parseLeadSource(rawText);
  const decision = evaluateIntake(parsed, {
    sourceLabel: leadSourceLabel[thread.source],
  });

  const destinationsJson = JSON.stringify(parsed.destinations);
  const clientType =
    parsed.tripType === "GROUP" || (parsed.paxCount != null && parsed.paxCount > 20)
      ? ("GROUP" as const)
      : thread.lead.clientType;

  const pipelineStage =
    decision.kind === "READY_TO_QUOTE"
      ? thread.lead.pipelineStage === "NEW" || thread.lead.pipelineStage === "CONTACTED"
        ? "QUALIFIED"
        : thread.lead.pipelineStage === "QUALIFIED"
          ? "QUOTING"
          : thread.lead.pipelineStage
      : thread.lead.pipelineStage === "NEW"
        ? "CONTACTED"
        : thread.lead.pipelineStage;

  const updated: Lead = await prisma.lead.update({
    where: { id: thread.lead.id },
    data: {
      firstName: parsed.firstName || thread.lead.firstName,
      lastName: parsed.lastName || thread.lead.lastName,
      email: parsed.email || thread.lead.email,
      phone: parsed.phone || thread.lead.phone,
      interest: parsed.interest || thread.lead.interest || thread.subject,
      paxCount: parsed.paxCount || thread.lead.paxCount,
      budgetHint: parsed.budgetHint ?? thread.lead.budgetHint,
      departureHint: parsed.departureHint || thread.lead.departureHint,
      durationDays: parsed.durationDays ?? thread.lead.durationDays,
      destinationsJson,
      parsedJson: JSON.stringify(parsed),
      rawSourceText: rawText,
      clientType,
      pipelineStage,
      intakeStatus: decision.kind === "READY_TO_QUOTE" ? "READY_TO_QUOTE" : "NEEDS_INFO",
      missingFieldsJson: JSON.stringify(decision.missing),
      draftReply:
        decision.kind === "NEEDS_INFO"
          ? decision.draftReply
          : thread.lead.draftReply ||
            `Buongiorno ${parsed.firstName || thread.lead.firstName},\n\nabbiamo i dati per una prima ipotesi: ve la prepariamo subito.\n\nUfficio Booking / Yoyiyo`,
      notes:
        decision.kind === "READY_TO_QUOTE"
          ? "AI commerciale (inbox): dati sufficienti → preventivo."
          : `AI commerciale (inbox): mancano ${decision.missing.join(", ")}.`,
      lastActivityAt: new Date(),
    },
  });

  let quoteId: string | null = null;
  if (decision.kind === "READY_TO_QUOTE" && input.autoQuote !== false) {
    quoteId = await buildBaseQuoteForLead(updated.id, input.organizationId, input.userId);
    if (quoteId && updated.pipelineStage !== "QUOTING" && updated.pipelineStage !== "WON") {
      await prisma.lead.update({
        where: { id: updated.id },
        data: { pipelineStage: "QUOTING", intakeStatus: "QUOTED" },
      });
    }
  }

  await prisma.inboxThread.update({
    where: { id: thread.id },
    data: {
      status: decision.kind === "READY_TO_QUOTE" ? "PENDING" : "OPEN",
    },
  });

  return {
    leadId: updated.id,
    quoteId,
    decision: decision.kind,
    missing: decision.missing,
    pipelineStage: quoteId ? "QUOTING" : pipelineStage,
    intakeStatus: quoteId ? "QUOTED" : decision.kind === "READY_TO_QUOTE" ? "READY_TO_QUOTE" : "NEEDS_INFO",
  };
}

export function summarizeCommercialAi(result: CommercialAiResult) {
  if (result.quoteId) {
    return `Preventivo creato · pipeline ${result.pipelineStage}`;
  }
  if (result.decision === "NEEDS_INFO") {
    return `Servono dati: ${result.missing.join(", ") || "n/d"}`;
  }
  return `Lead aggiornato · ${result.intakeStatus}`;
}

/** Exported for tests — thin wrapper over parse+evaluate on thread-like text. */
export function previewCommercialDecision(rawText: string, sourceLabel = "WhatsApp") {
  const parsed = parseLeadSource(rawText);
  const decision = evaluateIntake(parsed, { sourceLabel });
  return { parsed, decision };
}

export type { InboxThread };
