"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcQuoteTotals } from "@/lib/quote-math";
import { pickRateForDate } from "@/lib/suppliers/pricing";
import type { ProductType } from "@prisma/client";

async function requireQuote(quoteId: string, orgId: string) {
  return prisma.quote.findFirst({ where: { id: quoteId, organizationId: orgId } });
}

export async function addQuoteLineFromCatalogDated(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");
  const productId = String(formData.get("productId") || "");
  const ratePlanId = String(formData.get("ratePlanId") || "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));

  const quote = await requireQuote(quoteId, membership.organizationId);
  if (!quote) redirect("/app/preventivi");

  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, organizationId: membership.organizationId },
    include: { ratePlans: { orderBy: { createdAt: "asc" } } },
  });
  if (!product) redirect(`/app/preventivi/${quoteId}`);

  const rate =
    (ratePlanId ? product.ratePlans.find((r) => r.id === ratePlanId) : null) ||
    pickRateForDate(product.ratePlans, quote.departureDate);

  await prisma.quoteLine.create({
    data: {
      quoteId,
      productId: product.id,
      serviceType: product.type,
      title: product.name + (rate?.name ? ` · ${rate.name}` : ""),
      quantity,
      netCost: rate?.netCost ?? 0,
      unitPrice: rate?.sellPrice ?? 0,
      priceSource: product.priceSource,
      supplierCode: product.supplierCode,
      supplierRef: product.supplierRef,
      notes: rate?.cancellationPolicy || undefined,
    },
  });

  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  await prisma.quote.update({
    where: { id: quoteId },
    data: { ...recalcQuoteTotals(lines), updatedAt: new Date() },
  });

  redirect(`/app/preventivi/${quoteId}`);
}

export async function addQuoteLineFromSupplierOffer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));

  const quote = await requireQuote(quoteId, membership.organizationId);
  if (!quote) redirect("/app/preventivi");

  const serviceType = (String(formData.get("serviceType") || "OTHER") || "OTHER") as ProductType;
  const title = String(formData.get("title") || "Offerta fornitore").trim();
  const netCost = Number(formData.get("netCost") || 0);
  const unitPrice = Number(formData.get("unitPrice") || 0);
  const priceSource = (String(formData.get("priceSource") || "SUPPLIER_API") ||
    "SUPPLIER_API") as "OWN_LIST" | "SUPPLIER_API" | "MANUAL";
  const supplierCode = String(formData.get("supplierCode") || "") || null;
  const supplierRef = String(formData.get("supplierRef") || "") || null;
  const productId = String(formData.get("productId") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const connectorName = String(formData.get("connectorName") || "") || null;

  await prisma.quoteLine.create({
    data: {
      quoteId,
      productId,
      serviceType,
      title,
      quantity,
      netCost,
      unitPrice,
      priceSource,
      supplierCode,
      supplierRef,
      notes: [connectorName ? `Fonte: ${connectorName}` : null, notes].filter(Boolean).join(" · ") || null,
    },
  });

  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  await prisma.quote.update({
    where: { id: quoteId },
    data: { ...recalcQuoteTotals(lines), updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      userId: user.id,
      action: "QUOTE_LINE_SUPPLIER_OFFER",
      entityType: "Quote",
      entityId: quoteId,
      metaJson: JSON.stringify({ supplierCode, supplierRef, title, unitPrice }),
    },
  });

  redirect(`/app/preventivi/${quoteId}`);
}

export async function convertQuoteToPractice(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
    include: { lines: true },
  });
  if (!quote) redirect("/app/preventivi");

  if (quote.practiceId) {
    redirect(`/app/pratiche/${quote.practiceId}`);
  }

  const count = await prisma.practice.count({
    where: { organizationId: membership.organizationId },
  });
  const reference = `PRA-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const practice = await prisma.practice.create({
    data: {
      organizationId: membership.organizationId,
      brandId: quote.brandId,
      customerId: quote.customerId,
      partnerId: quote.partnerId,
      reference,
      title: quote.title,
      status: "QUOTED",
      channel: quote.channel,
      departureDate: quote.departureDate,
      returnDate: quote.returnDate,
      paxCount: quote.paxCount,
      currency: quote.currency,
      totalSell: quote.totalSell,
      totalCost: quote.totalCost,
      marginPct: quote.marginPct,
      notes: quote.notes,
      lines: {
        create: quote.lines.map((l) => ({
          productId: l.productId,
          serviceType: l.serviceType,
          title: l.title,
          quantity: l.quantity,
          netCost: l.netCost,
          sellPrice: l.unitPrice,
          status: "QUOTED",
          notes: l.notes,
        })),
      },
    },
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      practiceId: practice.id,
      status: quote.status === "DRAFT" ? "SENT" : quote.status,
      pipelineStage: "NEGOTIATION",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      userId: user.id,
      action: "QUOTE_TO_PRACTICE",
      entityType: "Practice",
      entityId: practice.id,
      metaJson: JSON.stringify({ quoteId: quote.id, reference }),
    },
  });

  redirect(`/app/pratiche/${practice.id}`);
}

export async function setConnectorEnabled(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("connectorId") || "");
  const enabled = String(formData.get("enabled") || "") === "1";

  await prisma.supplierConnector.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: {
      enabled,
      status: enabled ? "READY" : "DISABLED",
      updatedAt: new Date(),
    },
  });

  redirect("/app/fornitori");
}
