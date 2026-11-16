import type { PrismaClient } from "@prisma/client";
import {
  buildStageHistory,
  buildTrattativaTimeline,
  computeNextAction,
  type StageHistoryItem,
  type TrattativaNextAction,
  type TrattativaTimelineItem,
} from "@/lib/crm/trattativa";

export async function loadTrattativa(prisma: PrismaClient, orgId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      assignee: true,
      quotes: {
        orderBy: { updatedAt: "desc" },
        include: {
          practice: true,
          contracts: true,
          invoices: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { connection: true, user: true },
      },
      inboxThreads: {
        orderBy: [{ unreadCount: "desc" }, { lastAt: "desc" }],
        include: {
          connection: true,
        },
      },
    },
  });

  if (!lead) return null;

  const practiceIds = new Set<string>();
  for (const q of lead.quotes) {
    if (q.practiceId) practiceIds.add(q.practiceId);
  }

  const practicesByCustomer = lead.customerId
    ? await prisma.practice.findMany({
        where: { organizationId: orgId, customerId: lead.customerId },
        include: {
          contracts: { orderBy: { updatedAt: "desc" } },
          invoices: { orderBy: { issueDate: "desc" } },
          quotes: { select: { id: true, number: true, leadId: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  for (const p of practicesByCustomer) practiceIds.add(p.id);

  const practices =
    practiceIds.size > 0
      ? await prisma.practice.findMany({
          where: { organizationId: orgId, id: { in: [...practiceIds] } },
          include: {
            contracts: { orderBy: { updatedAt: "desc" } },
            invoices: { orderBy: { issueDate: "desc" } },
            quotes: { select: { id: true, number: true, leadId: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  // Prefer practices linked via this lead's quotes, then customer practices.
  const quotePracticeIds = new Set(
    lead.quotes.map((q) => q.practiceId).filter(Boolean) as string[],
  );
  const rankedPractices = [
    ...practices.filter((p) => quotePracticeIds.has(p.id)),
    ...practices.filter((p) => !quotePracticeIds.has(p.id)),
  ];

  const contracts = rankedPractices.flatMap((p) =>
    p.contracts.map((c) => ({ ...c, practiceReference: p.reference })),
  );
  const invoices = rankedPractices.flatMap((p) => p.invoices);
  const invoicesAr = invoices.filter((i) => i.direction === "AR");

  const audits = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      entityType: "Lead",
      entityId: lead.id,
      action: { in: ["LEAD_CREATE", "LEAD_STAGE_CHANGE"] },
    },
    orderBy: { createdAt: "asc" },
  });

  const missing = lead.missingFieldsJson
    ? (JSON.parse(lead.missingFieldsJson) as string[])
    : [];

  const unreadCount = lead.inboxThreads.reduce((n, t) => n + (t.unreadCount || 0), 0);
  const primaryThread =
    lead.inboxThreads.find((t) => t.unreadCount > 0) || lead.inboxThreads[0] || null;

  const stageHistory: StageHistoryItem[] = buildStageHistory({
    createdAt: lead.createdAt,
    currentStage: lead.pipelineStage,
    audits,
  });

  const nextAction: TrattativaNextAction = computeNextAction({
    leadId: lead.id,
    pipelineStage: lead.pipelineStage,
    intakeStatus: lead.intakeStatus,
    missingFields: missing,
    unreadCount,
    primaryThreadId: primaryThread?.id,
    quotes: lead.quotes.map((q) => ({ id: q.id, status: q.status, number: q.number })),
    practices: rankedPractices.map((p) => ({
      id: p.id,
      status: p.status,
      reference: p.reference,
    })),
    contracts: contracts.map((c) => ({
      id: c.id,
      practiceId: c.practiceId,
      status: c.status,
      signedAt: c.signedAt,
    })),
    invoicesAr: invoicesAr.map((i) => ({
      id: i.id,
      status: i.status,
      number: i.number,
    })),
  });

  const timeline: TrattativaTimelineItem[] = buildTrattativaTimeline({
    leadCreatedAt: lead.createdAt,
    stageHistory,
    messages: lead.messages,
    threads: lead.inboxThreads,
    quotes: lead.quotes,
    practices: rankedPractices,
    contracts,
    invoices,
  });

  const siblingLeads = lead.customerId
    ? await prisma.lead.findMany({
        where: {
          organizationId: orgId,
          customerId: lead.customerId,
          id: { not: lead.id },
        },
        orderBy: { lastActivityAt: "desc" },
        select: {
          id: true,
          pipelineName: true,
          interest: true,
          pipelineStage: true,
          lastActivityAt: true,
        },
      })
    : [];

  return {
    lead,
    practices: rankedPractices,
    contracts,
    invoices,
    invoicesAr,
    stageHistory,
    nextAction,
    timeline,
    unreadCount,
    primaryThread,
    missing,
    siblingLeads,
  };
}

export type LoadedTrattativa = NonNullable<Awaited<ReturnType<typeof loadTrattativa>>>;
