"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildContractHtml, newSignToken } from "@/lib/practices/contract";

async function loadPractice(id: string, orgId: string) {
  return prisma.practice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      lines: { orderBy: { createdAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Conferma pratica (se serve) + genera contratto DRAFT + documento CONTRATTO. */
export async function createPracticeContract(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const practiceId = String(formData.get("practiceId") || "");
  const practice = await loadPractice(practiceId, orgId);
  if (!practice) redirect("/app/pratiche");

  const confirmNow = formData.get("confirmPractice") === "1";
  if (confirmNow && practice.status !== "CONFIRMED" && practice.status !== "IN_PROGRESS" && practice.status !== "COMPLETED") {
    await prisma.practice.update({
      where: { id: practiceId },
      data: { status: "CONFIRMED", confirmedAt: practice.confirmedAt || new Date() },
    });
    await prisma.practiceChange.create({
      data: {
        practiceId,
        kind: "CONFIRMATION",
        title: "Pratica confermata (da contratto)",
        detail: "Conferma automatica all’emissione del contratto.",
        sellBase: practice.totalSell,
        createdByUserId: user.id,
      },
    });
  }

  const refreshed = (await loadPractice(practiceId, orgId))!;
  const signerName = String(formData.get("signerName") || "").trim()
    || (refreshed.customer
      ? `${refreshed.customer.firstName} ${refreshed.customer.lastName}`
      : refreshed.partner?.name || "Firmatario");
  const signerEmail =
    String(formData.get("signerEmail") || "").trim()
    || refreshed.customer?.email
    || refreshed.partner?.email
    || null;

  const quote = refreshed.quotes[0] || null;
  const built = buildContractHtml(refreshed, {
    signerName,
    quoteNumber: quote?.number,
  });

  const last = await prisma.practiceContract.findFirst({
    where: { practiceId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version || 0) + 1;
  const token = newSignToken();

  const contract = await prisma.practiceContract.create({
    data: {
      organizationId: orgId,
      practiceId,
      quoteId: quote?.id || null,
      status: "DRAFT",
      title: `${built.title} v${version}`,
      bodyHtml: built.bodyHtml,
      version,
      signToken: token,
      signerName,
      signerEmail,
      providerRef: `stub-esign-draft-${token.slice(-8)}`,
      notes: "E-sign sandbox: invia e firma senza provider live.",
    },
  });

  await prisma.practiceDocument.create({
    data: {
      practiceId,
      type: "CONTRATTO",
      title: contract.title,
      bodyHtml: built.bodyHtml,
      version,
      generatedByUserId: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "CONTRACT_CREATED",
      entityType: "PracticeContract",
      entityId: contract.id,
      metaJson: JSON.stringify({ practiceId, version, token }),
    },
  });

  redirect(`/app/pratiche/${practiceId}/contratti/${contract.id}`);
}

export async function sendContractForSignature(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  const contract = await prisma.practiceContract.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!contract) redirect("/app/pratiche");

  await prisma.practiceContract.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerRef: `stub-esign-sent-${contract.signToken.slice(-8)}`,
      signatureMetaJson: JSON.stringify({
        channel: "sandbox_link",
        to: contract.signerEmail || contract.signerName,
        at: new Date().toISOString(),
      }),
    },
  });

  redirect(`/app/pratiche/${contract.practiceId}/contratti/${id}?sent=1`);
}

export async function cancelContract(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  const contract = await prisma.practiceContract.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!contract) redirect("/app/pratiche");
  await prisma.practiceContract.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  redirect(`/app/pratiche/${contract.practiceId}/contratti/${id}`);
}

/** Public sandbox sign — no auth. */
export async function markContractViewed(token: string) {
  const contract = await prisma.practiceContract.findFirst({
    where: { signToken: token },
  });
  if (!contract) return null;
  if (contract.status === "SENT" && !contract.viewedAt) {
    await prisma.practiceContract.update({
      where: { id: contract.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }
  return contract.id;
}

export async function signContractStub(formData: FormData) {
  const token = String(formData.get("token") || "");
  const typedName = String(formData.get("typedName") || "").trim();
  const accept = formData.get("accept") === "1";
  const contract = await prisma.practiceContract.findFirst({
    where: { signToken: token },
    include: { practice: true },
  });
  if (!contract) redirect("/firma/invalid");
  if (contract.status === "SIGNED") redirect(`/firma/${token}?already=1`);
  if (contract.status === "CANCELLED" || contract.status === "DECLINED") {
    redirect(`/firma/${token}?blocked=1`);
  }
  if (!accept || !typedName) redirect(`/firma/${token}?err=1`);

  await prisma.practiceContract.update({
    where: { id: contract.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      viewedAt: contract.viewedAt || new Date(),
      signerName: typedName,
      providerRef: `stub-esign-signed-${Date.now().toString(36)}`,
      signatureMetaJson: JSON.stringify({
        typedName,
        method: "typed_name_stub",
        ip: "sandbox",
        at: new Date().toISOString(),
      }),
    },
  });

  if (contract.practice.status === "DRAFT" || contract.practice.status === "QUOTED") {
    await prisma.practice.update({
      where: { id: contract.practiceId },
      data: {
        status: "CONFIRMED",
        confirmedAt: contract.practice.confirmedAt || new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: contract.organizationId,
      action: "CONTRACT_SIGNED_STUB",
      entityType: "PracticeContract",
      entityId: contract.id,
      metaJson: JSON.stringify({ typedName, practiceId: contract.practiceId }),
    },
  });

  redirect(`/firma/${token}?signed=1`);
}

export async function declineContractStub(formData: FormData) {
  const token = String(formData.get("token") || "");
  const contract = await prisma.practiceContract.findFirst({
    where: { signToken: token },
  });
  if (!contract) redirect("/firma/invalid");
  await prisma.practiceContract.update({
    where: { id: contract.id },
    data: { status: "DECLINED", declinedAt: new Date() },
  });
  redirect(`/firma/${token}?declined=1`);
}
