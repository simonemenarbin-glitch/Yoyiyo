"use server";

import { redirect } from "next/navigation";
import type { LeadSource, PipelineStage, SalesChannel } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcQuoteTotals } from "@/lib/quote-math";

function channelFromSource(source: LeadSource): SalesChannel {
  switch (source) {
    case "WHATSAPP":
      return "WHATSAPP";
    case "EMAIL":
      return "EMAIL";
    case "INSTAGRAM":
      return "INSTAGRAM";
    case "FACEBOOK":
      return "FACEBOOK";
    case "WEB":
      return "WEB";
    default:
      return "COUNTER";
  }
}

export async function createLead(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const lead = await prisma.lead.create({
    data: {
      organizationId: orgId,
      brandId: String(formData.get("brandId") || "") || null,
      assigneeUserId: user.id,
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      source: (String(formData.get("source") || "OTHER") as LeadSource) || "OTHER",
      sourceDetail: String(formData.get("sourceDetail") || "") || null,
      interest: String(formData.get("interest") || "") || null,
      paxCount: Number(formData.get("paxCount") || 2),
      budgetHint: formData.get("budgetHint")
        ? Number(formData.get("budgetHint"))
        : null,
      notes: String(formData.get("notes") || "") || null,
      pipelineStage: "NEW",
      lastActivityAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "LEAD_CREATE",
      entityType: "Lead",
      entityId: lead.id,
    },
  });

  redirect(`/app/crm/leads/${lead.id}`);
}

export async function updateLeadStage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const leadId = String(formData.get("leadId") || "");
  const stage = String(formData.get("pipelineStage") || "") as PipelineStage;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: membership.organizationId },
  });
  if (!lead) redirect("/app/crm");

  await prisma.lead.update({
    where: { id: lead.id },
    data: { pipelineStage: stage, lastActivityAt: new Date() },
  });

  redirect(`/app/crm/leads/${lead.id}`);
}

export async function createQuoteFromLead(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const leadId = String(formData.get("leadId") || "");

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
  });
  if (!lead) redirect("/app/crm");

  let customerId = lead.customerId;
  if (!customerId) {
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        notes: `Da lead ${lead.source}`,
      },
    });
    customerId = customer.id;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerId },
    });
  }

  const count = await prisma.quote.count({ where: { organizationId: orgId } });
  const number = `QT-2026-${String(count + 1).padStart(4, "0")}`;
  const title =
    lead.interest?.trim() ||
    `Preventivo ${lead.firstName} ${lead.lastName}`;

  const quote = await prisma.quote.create({
    data: {
      organizationId: orgId,
      brandId: lead.brandId,
      customerId,
      partnerId: lead.partnerId,
      leadId: lead.id,
      number,
      title,
      status: "DRAFT",
      channel: channelFromSource(lead.source),
      pipelineStage: "QUOTING",
      paxCount: lead.paxCount,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hypothesisNote:
        "Questa è un’ipotesi che costruiamo senza avere un budget. Se sembra troppo alta o troppo basica, o se ci sono già altri preventivi che indicano una fascia, lo diciamo: ci adeguiamo a quello che serve.",
      notes:
        "Validità 7 giorni. Prima ipotesi di lavoro — non è un programma chiuso. Listino proprio oggi; API fornitori in arrivo.",
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { pipelineStage: "QUOTING", lastActivityAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "QUOTE_FROM_LEAD",
      entityType: "Quote",
      entityId: quote.id,
      metaJson: JSON.stringify({ leadId: lead.id }),
    },
  });

  redirect(`/app/preventivi/${quote.id}`);
}

export async function addQuoteLineFromCatalog(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");
  const productId = String(formData.get("productId") || "");
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
  });
  if (!quote) redirect("/app/preventivi");

  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, organizationId: membership.organizationId },
    include: { ratePlans: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!product) redirect(`/app/preventivi/${quoteId}`);

  const rate = product.ratePlans[0];
  await prisma.quoteLine.create({
    data: {
      quoteId,
      productId: product.id,
      serviceType: product.type,
      title: product.name,
      quantity,
      netCost: rate?.netCost ?? 0,
      unitPrice: rate?.sellPrice ?? 0,
      priceSource: product.priceSource,
      supplierCode: product.supplierCode,
      supplierRef: product.supplierRef,
    },
  });

  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  const totals = recalcQuoteTotals(lines);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { ...totals, updatedAt: new Date() },
  });

  redirect(`/app/preventivi/${quoteId}`);
}

export async function addManualQuoteLine(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
  });
  if (!quote) redirect("/app/preventivi");

  await prisma.quoteLine.create({
    data: {
      quoteId,
      title: String(formData.get("title") || "Voce manuale").trim(),
      serviceType: (String(formData.get("serviceType") || "OTHER") as
        | "HOTEL"
        | "FLIGHT"
        | "TRANSFER"
        | "EXCURSION"
        | "CRUISE"
        | "FERRY"
        | "INSURANCE"
        | "PACKAGE"
        | "OTHER") || "OTHER",
      quantity: Math.max(1, Number(formData.get("quantity") || 1)),
      netCost: Number(formData.get("netCost") || 0),
      unitPrice: Number(formData.get("unitPrice") || 0),
      priceSource: "MANUAL",
    },
  });

  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  const totals = recalcQuoteTotals(lines);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { ...totals, updatedAt: new Date() },
  });

  redirect(`/app/preventivi/${quoteId}`);
}

export async function removeQuoteLine(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");
  const lineId = String(formData.get("lineId") || "");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
  });
  if (!quote) redirect("/app/preventivi");

  await prisma.quoteLine.deleteMany({ where: { id: lineId, quoteId } });
  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  const totals = recalcQuoteTotals(lines);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { ...totals, updatedAt: new Date() },
  });

  redirect(`/app/preventivi/${quoteId}`);
}

export async function updateQuotePipeline(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");
  const status = String(formData.get("status") || "") as
    | "DRAFT"
    | "SENT"
    | "ACCEPTED"
    | "REJECTED"
    | "EXPIRED";
  const pipelineStage = String(formData.get("pipelineStage") || "") as PipelineStage;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
  });
  if (!quote) redirect("/app/preventivi");

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: status || quote.status,
      pipelineStage: pipelineStage || quote.pipelineStage,
      updatedAt: new Date(),
    },
  });

  if (quote.leadId && pipelineStage) {
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: {
        pipelineStage,
        lastActivityAt: new Date(),
      },
    });
  }

  redirect(`/app/preventivi/${quoteId}`);
}
