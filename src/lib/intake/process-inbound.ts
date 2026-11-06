import type { ChannelKind, LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickCatalogLines, quoteTitleFromLead } from "@/lib/intake/auto-quote";
import { evaluateIntake } from "@/lib/intake/evaluate";
import { parseLeadSource } from "@/lib/intake/parse-source";
import type { IntakeDecision, ParsedLeadFields } from "@/lib/intake/types";
import { leadSourceLabel } from "@/lib/labels";

function channelFromSource(source: LeadSource) {
  switch (source) {
    case "WHATSAPP":
      return "WHATSAPP" as const;
    case "EMAIL":
      return "EMAIL" as const;
    case "INSTAGRAM":
      return "INSTAGRAM" as const;
    case "FACEBOOK":
      return "FACEBOOK" as const;
    case "WEB":
      return "WEB" as const;
    default:
      return "COUNTER" as const;
  }
}

function applyParsedToLeadData(parsed: ParsedLeadFields) {
  return {
    firstName: parsed.firstName || "Cliente",
    lastName: parsed.lastName || "Lead",
    email: parsed.email,
    phone: parsed.phone,
    interest: parsed.interest,
    paxCount: parsed.paxCount || 2,
    budgetHint: parsed.budgetHint,
    departureHint: parsed.departureHint,
    durationDays: parsed.durationDays,
    destinationsJson: JSON.stringify(parsed.destinations),
    parsedJson: JSON.stringify(parsed),
  };
}

async function ensureCustomerForLead(lead: {
  id: string;
  organizationId: string;
  customerId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
}) {
  if (lead.customerId) return lead.customerId;
  const customer = await prisma.customer.create({
    data: {
      organizationId: lead.organizationId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      notes: `Da lead intake ${lead.source}`,
    },
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { customerId: customer.id },
  });
  return customer.id;
}

export async function buildBaseQuoteForLead(leadId: string, orgId: string, userId?: string | null) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
  if (!lead) return null;

  const destinations = lead.destinationsJson
    ? (JSON.parse(lead.destinationsJson) as string[])
    : [];

  const products = await prisma.catalogProduct.findMany({
    where: { organizationId: orgId },
    include: { ratePlans: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const { lines, totals } = pickCatalogLines({
    products,
    destinations,
    interest: lead.interest,
    paxCount: lead.paxCount,
    durationDays: lead.durationDays,
  });

  const customerId = await ensureCustomerForLead(lead);
  const count = await prisma.quote.count({ where: { organizationId: orgId } });
  const number = `QT-2026-${String(count + 1).padStart(4, "0")}`;

  const quote = await prisma.quote.create({
    data: {
      organizationId: orgId,
      brandId: lead.brandId,
      customerId,
      partnerId: lead.partnerId,
      leadId: lead.id,
      number,
      title: quoteTitleFromLead(lead),
      status: "DRAFT",
      channel: channelFromSource(lead.source),
      pipelineStage: "QUOTING",
      paxCount: lead.paxCount,
      ...totals,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hypothesisNote:
        "Questa è un’ipotesi che costruiamo senza avere un budget. Se sembra troppo alta o troppo basica, o se ci sono già altri preventivi che indicano una fascia, lo diciamo: ci adeguiamo a quello che serve.",
      notes:
        "Preventivo base automatico da sync canale. Righe da listino proprio e/o slot API fornitore. Validità 7 giorni — non è un programma chiuso.",
      lines: { create: lines },
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      intakeStatus: "QUOTED",
      pipelineStage: "QUOTING",
      lastActivityAt: new Date(),
    },
  });

  if (userId) {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: "AUTO_QUOTE_FROM_INTAKE",
        entityType: "Quote",
        entityId: quote.id,
        metaJson: JSON.stringify({ leadId: lead.id, lines: lines.length }),
      },
    });
  }

  return quote.id;
}

export type ProcessInboundResult = {
  leadId: string;
  quoteId: string | null;
  decision: IntakeDecision["kind"];
  missing: string[];
};

export async function processInboundMessage(input: {
  organizationId: string;
  userId?: string | null;
  brandId?: string | null;
  source: LeadSource;
  sourceDetail?: string | null;
  rawText: string;
  autoQuote?: boolean;
  connectionId?: string | null;
  channelKind?: ChannelKind | null;
  fromAddress?: string | null;
  subject?: string | null;
  ingestedId?: string | null;
  receivedAt?: Date | null;
}): Promise<ProcessInboundResult> {
  const parsed = parseLeadSource(input.rawText);
  const decision = evaluateIntake(parsed, {
    sourceLabel: leadSourceLabel[input.source],
  });
  const base = applyParsedToLeadData(parsed);
  const autoQuote = input.autoQuote !== false;

  const clientType =
    parsed.tripType === "GROUP" || (parsed.paxCount != null && parsed.paxCount > 20)
      ? ("GROUP" as const)
      : ("B2C" as const);

  const lead = await prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      brandId: input.brandId || null,
      assigneeUserId: input.userId || null,
      source: input.source,
      sourceDetail: input.sourceDetail || null,
      clientType,
      pipelineName: parsed.interest?.slice(0, 80) || `Pipeline ${base.firstName} ${base.lastName}`,
      rawSourceText: input.rawText,
      pipelineStage: decision.kind === "READY_TO_QUOTE" ? "QUALIFIED" : "NEW",
      intakeStatus: decision.kind === "READY_TO_QUOTE" ? "READY_TO_QUOTE" : "NEEDS_INFO",
      missingFieldsJson: JSON.stringify(decision.missing),
      draftReply: decision.kind === "NEEDS_INFO" ? decision.draftReply : null,
      notes:
        decision.kind === "READY_TO_QUOTE"
          ? "Sync canale: dati sufficienti → preventivo base."
          : `Sync canale: bozza risposta pronta (mancano ${decision.missing.join(", ")}).`,
      ...base,
      lastActivityAt: new Date(),
    },
  });

  let quoteId: string | null = null;
  if (decision.kind === "READY_TO_QUOTE" && autoQuote) {
    quoteId = await buildBaseQuoteForLead(lead.id, input.organizationId, input.userId);
  }

  // Timeline: messaggio in ingresso
  try {
    await prisma.conversationMessage.create({
      data: {
        organizationId: input.organizationId,
        leadId: lead.id,
        connectionId: input.connectionId || null,
        userId: input.userId || null,
        direction: "IN",
        source: input.source,
        channelKind: input.channelKind || null,
        status: "LOGGED",
        fromAddress: input.fromAddress || parsed.email || parsed.phone,
        subject: input.subject || input.sourceDetail || null,
        body: input.rawText,
        ingestedId: input.ingestedId || null,
        sentAt: input.receivedAt || new Date(),
      },
    });
  } catch {
    // non-blocking
  }

  return {
    leadId: lead.id,
    quoteId,
    decision: decision.kind,
    missing: decision.missing,
  };
}
