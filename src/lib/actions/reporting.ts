"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestCashDeadlines } from "@/lib/reporting/cash";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return primaryMembership(user)!.organizationId;
}

export async function generateCashDeadlinesForPractice(formData: FormData) {
  const orgId = await requireOrg();
  const practiceId = String(formData.get("practiceId") || "");
  const practice = await prisma.practice.findFirst({
    where: { id: practiceId, organizationId: orgId },
  });
  if (!practice) throw new Error("Pratica non trovata");

  const suggestions = suggestCashDeadlines(practice);
  for (const s of suggestions) {
    await prisma.cashDeadline.create({
      data: {
        organizationId: orgId,
        practiceId: practice.id,
        kind: s.kind,
        label: s.label,
        dueDate: s.dueDate,
        amount: s.amount,
        notes: s.notes || null,
        status: "OPEN",
      },
    });
  }
  revalidatePath("/app/reporting");
}

export async function markCashDeadlinePaid(formData: FormData) {
  const orgId = await requireOrg();
  const id = String(formData.get("deadlineId") || "");
  const row = await prisma.cashDeadline.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!row) throw new Error("Scadenza non trovata");
  await prisma.cashDeadline.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/app/reporting");
}

export async function syncOverdueCashDeadlines() {
  const orgId = await requireOrg();
  const now = new Date();
  await prisma.cashDeadline.updateMany({
    where: {
      organizationId: orgId,
      status: "OPEN",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
  revalidatePath("/app/reporting");
}
