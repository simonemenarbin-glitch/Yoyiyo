"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSdiStubPayload,
  computeSeventyFourTer,
  nextFiscalNumber,
} from "@/lib/accounting/seventy-four-ter";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user, orgId: primaryMembership(user)!.organizationId };
}

export async function createFiscalFromPractice(formData: FormData) {
  const { orgId } = await requireOrg();
  const practiceId = String(formData.get("practiceId") || "");
  const practice = await prisma.practice.findFirst({
    where: { id: practiceId, organizationId: orgId },
    include: { customer: true, partner: true },
  });
  if (!practice) throw new Error("Pratica non trovata");

  const year = new Date().getFullYear();
  const count = await prisma.fiscalDocument.count({ where: { organizationId: orgId } });
  const calc = computeSeventyFourTer({
    totalSell: practice.totalSell,
    totalCost: practice.totalCost,
    vatRate: Number(formData.get("vatRate") || 22) || 22,
  });

  const customerName = practice.customer
    ? `${practice.customer.firstName} ${practice.customer.lastName}`
    : practice.partner?.name || "Cliente";

  const doc = await prisma.fiscalDocument.create({
    data: {
      organizationId: orgId,
      practiceId: practice.id,
      customerId: practice.customerId,
      partnerId: practice.partnerId,
      kind: "FATTURA_74TER",
      status: "DRAFT",
      number: nextFiscalNumber(year, count + 1),
      customerName,
      customerVat: null,
      totalSell: calc.totalSell,
      totalCost: calc.totalCost,
      marginBase: calc.marginBase,
      vatRate: calc.vatRate,
      vatAmount: calc.vatAmount,
      notes: calc.explanation,
      linesJson: JSON.stringify([
        {
          description: practice.title,
          reference: practice.reference,
          sell: calc.totalSell,
          cost: calc.totalCost,
        },
      ]),
    },
  });

  revalidatePath("/app/contabilita");
  redirect(`/app/contabilita/${doc.id}`);
}

export async function issueFiscalDocument(formData: FormData) {
  const { orgId } = await requireOrg();
  const id = String(formData.get("documentId") || "");
  const doc = await prisma.fiscalDocument.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!doc) throw new Error("Documento non trovato");

  await prisma.fiscalDocument.update({
    where: { id },
    data: { status: "ISSUED", issueDate: new Date() },
  });
  revalidatePath(`/app/contabilita/${id}`);
  revalidatePath("/app/contabilita");
}

export async function sendFiscalToSdiStub(formData: FormData) {
  const { orgId } = await requireOrg();
  const id = String(formData.get("documentId") || "");
  const doc = await prisma.fiscalDocument.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!doc) throw new Error("Documento non trovato");

  const payload = buildSdiStubPayload(doc);
  const messageId = `SDI-STUB-${Date.now().toString(36).toUpperCase()}`;

  await prisma.fiscalDocument.update({
    where: { id },
    data: {
      status: "SENT_SDI_STUB",
      sdiStatus: "SENT",
      sdiMessageId: messageId,
      sdiSentAt: new Date(),
      sdiResponseJson: JSON.stringify({ ...payload, messageId, outcome: "RC-demo" }),
    },
  });

  // Auto-accept after stub send (simulates SdI delivery notification)
  await prisma.fiscalDocument.update({
    where: { id },
    data: {
      status: "ACCEPTED_STUB",
      sdiStatus: "DELIVERED",
      sdiResponseJson: JSON.stringify({
        ...payload,
        messageId,
        outcome: "NE-demo",
        note: "Notifica esito demo — nessun SdI reale",
      }),
    },
  });

  revalidatePath(`/app/contabilita/${id}`);
  revalidatePath("/app/contabilita");
}
