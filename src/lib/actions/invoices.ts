"use server";

import { redirect } from "next/navigation";
import type { InvoiceDirection, InvoiceRegime, InvoiceStatus } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcSeventyFourTer,
  calcStandardVat,
  deriveInvoiceStatus,
  nextInvoiceNumber,
  sumLineCosts,
  sumLines,
  type InvoiceLineInput,
} from "@/lib/accounting/invoices";

function parseLines(formData: FormData): InvoiceLineInput[] {
  const raw = String(formData.get("linesJson") || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as InvoiceLineInput[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through */
    }
  }
  const description = String(formData.get("lineDescription") || "Servizi viaggio").trim();
  const quantity = Number(formData.get("lineQty") || 1) || 1;
  const unitPrice = Number(formData.get("lineUnitPrice") || 0) || 0;
  const netCost = Number(formData.get("lineNetCost") || 0) || 0;
  return [{ description, quantity, unitPrice, netCost }];
}

export async function createInvoice(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const direction = (String(formData.get("direction") || "AR") as InvoiceDirection) || "AR";
  const regime = (String(formData.get("regime") || "STANDARD") as InvoiceRegime) || "STANDARD";
  const practiceId = String(formData.get("practiceId") || "") || null;
  const quoteId = String(formData.get("quoteId") || "") || null;
  const customerId = String(formData.get("customerId") || "") || null;
  const partnerId = String(formData.get("partnerId") || "") || null;

  let counterpartyName = String(formData.get("counterpartyName") || "").trim();
  const counterpartyVat = String(formData.get("counterpartyVat") || "").trim() || null;
  const counterpartyEmail = String(formData.get("counterpartyEmail") || "").trim() || null;

  let lines = parseLines(formData);
  let practiceRef: string | null = null;

  if (practiceId) {
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, organizationId: orgId },
      include: { customer: true, partner: true, lines: true },
    });
    if (practice) {
      practiceRef = practice.reference;
      if (!counterpartyName) {
        counterpartyName =
          direction === "AR"
            ? practice.customer
              ? `${practice.customer.firstName} ${practice.customer.lastName}`
              : practice.partner?.name || "Cliente"
            : practice.partner?.name || "Fornitore";
      }
      if (direction === "AR" && !customerId && practice.customerId) {
        // keep link
      }
      if (!lines.length || (lines.length === 1 && lines[0].unitPrice === 0)) {
        lines = practice.lines.map((l) => ({
          description: l.title,
          quantity: l.quantity,
          unitPrice: direction === "AR" ? l.sellPrice : l.netCost,
          netCost: l.netCost,
        }));
      }
    }
  }

  if (!counterpartyName) counterpartyName = direction === "AR" ? "Cliente" : "Fornitore";

  const existing = await prisma.invoice.findMany({
    where: { organizationId: orgId, direction },
    select: { number: true },
  });
  const number =
    String(formData.get("number") || "").trim() ||
    nextInvoiceNumber(
      direction,
      existing.map((e) => e.number),
    );

  const vatRate = Number(formData.get("vatRate") || 22) || 22;
  const sell = sumLines(lines);
  const cost = sumLineCosts(lines);
  const amounts =
    regime === "MARGIN_74TER"
      ? calcSeventyFourTer({ totalSell: sell, totalCost: cost, vatRate })
      : { ...calcStandardVat(sell, vatRate), marginBase: 0, costBase: cost };

  const dueDays = Number(formData.get("dueDays") || 30) || 30;
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + dueDays * 86400_000);
  const status = (String(formData.get("status") || "ISSUED") as InvoiceStatus) || "ISSUED";

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      direction,
      status,
      regime,
      number,
      issueDate,
      dueDate,
      practiceId,
      quoteId,
      customerId: customerId || (practiceId ? (await prisma.practice.findFirst({ where: { id: practiceId } }))?.customerId || null : null),
      partnerId: partnerId || null,
      counterpartyName,
      counterpartyVat,
      counterpartyEmail,
      subtotal: amounts.subtotal,
      vatRate: amounts.vatRate ?? vatRate,
      vatAmount: amounts.vatAmount,
      total: amounts.total,
      marginBase: amounts.marginBase || 0,
      costBase: amounts.costBase || 0,
      linesJson: JSON.stringify(lines),
      notes:
        String(formData.get("notes") || "").trim() ||
        (practiceRef ? `Da pratica ${practiceRef}` : null),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metaJson: JSON.stringify({ direction, number, practiceId, regime }),
    },
  });

  redirect(`/app/contabilita/${invoice.id}`);
}

export async function updateInvoiceStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as InvoiceStatus;
  const paidAmount = Number(formData.get("paidAmount") || 0) || 0;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!invoice) redirect("/app/contabilita");

  const nextStatus = deriveInvoiceStatus({
    status: status || invoice.status,
    total: invoice.total,
    paidAmount: paidAmount || invoice.paidAmount,
    dueDate: invoice.dueDate,
  });

  await prisma.invoice.update({
    where: { id },
    data: {
      status: nextStatus,
      paidAmount: paidAmount || invoice.paidAmount,
      paidAt:
        nextStatus === "PAID"
          ? new Date()
          : paidAmount > 0
            ? invoice.paidAt || new Date()
            : null,
    },
  });
  redirect(`/app/contabilita/${id}`);
}

export async function markInvoicePaid(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!invoice) redirect("/app/contabilita");
  await prisma.invoice.update({
    where: { id },
    data: {
      status: "PAID",
      paidAmount: invoice.total,
      paidAt: new Date(),
    },
  });
  redirect(`/app/contabilita/${id}?paid=1`);
}
