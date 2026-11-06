"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeCancellationPenalty,
  suggestedDeposit,
} from "@/lib/practices/penalties";
import {
  buildConfermaHtml,
  buildFoglioNotizieHtml,
  buildVoucherHtml,
} from "@/lib/practices/documents";
import type { PracticeDocType, PracticeStatus } from "@prisma/client";

async function loadPractice(id: string, orgId: string) {
  return prisma.practice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      lines: { orderBy: { createdAt: "asc" } },
    },
  });
}

function recalcTotals(lines: { quantity: number; sellPrice: number; netCost: number }[]) {
  const totalSell = lines.reduce((s, l) => s + l.sellPrice * l.quantity, 0);
  const totalCost = lines.reduce((s, l) => s + l.netCost * l.quantity, 0);
  const marginPct = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  return { totalSell, totalCost, marginPct };
}

export async function updatePracticeOps(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const practiceId = String(formData.get("practiceId") || "");
  const practice = await loadPractice(practiceId, membership.organizationId);
  if (!practice) redirect("/app/pratiche");

  const status = String(formData.get("status") || practice.status) as PracticeStatus;
  const paxCount = Math.max(1, Number(formData.get("paxCount") || practice.paxCount));
  const groupageOver20 =
    String(formData.get("groupageOver20") || "") === "1" || paxCount > 20;
  const notes = String(formData.get("notes") || "") || null;
  const departureRaw = String(formData.get("departureDate") || "").trim();
  const returnRaw = String(formData.get("returnDate") || "").trim();
  const releaseDays = Math.max(
    1,
    Number(formData.get("releaseDays") || practice.releaseDays || 120),
  );
  const deposit = suggestedDeposit(practice.totalSell, groupageOver20);

  const data: Record<string, unknown> = {
    status,
    paxCount,
    groupageOver20,
    notes,
    depositPct: groupageOver20 ? 10 : 0,
    depositAmount: groupageOver20 ? deposit.amount : 0,
    releaseDays,
    departureDate: departureRaw ? new Date(`${departureRaw}T12:00:00`) : null,
    returnDate: returnRaw ? new Date(`${returnRaw}T12:00:00`) : null,
    updatedAt: new Date(),
  };

  if (status === "CONFIRMED" && !practice.confirmedAt) {
    data.confirmedAt = new Date();
  }
  if (status !== "CONFIRMED" && status !== "IN_PROGRESS" && status !== "COMPLETED") {
    // keep confirmedAt if already set
  }

  await prisma.practice.update({ where: { id: practiceId }, data });

  if (status === "CONFIRMED" && !practice.confirmedAt) {
    await prisma.practiceChange.create({
      data: {
        practiceId,
        kind: "CONFIRMATION",
        title: "Pratica confermata",
        detail: groupageOver20
          ? `Groupage >20: acconto 10% (€ ${deposit.amount}), release voli 120 gg.`
          : "FIT / fino a 20 pax: penali standard dalla conferma.",
        sellBase: practice.totalSell,
        createdByUserId: user.id,
      },
    });
  }

  redirect(`/app/pratiche/${practiceId}`);
}

export async function registerPracticeVariation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const practiceId = String(formData.get("practiceId") || "");
  const practice = await loadPractice(practiceId, membership.organizationId);
  if (!practice) redirect("/app/pratiche");

  const title = String(formData.get("title") || "Variazione").trim();
  const detail = String(formData.get("detail") || "") || null;
  const sellDelta = Number(formData.get("sellDelta") || 0);
  const costDelta = Number(formData.get("costDelta") || 0);
  const paxAffected = formData.get("paxAffected")
    ? Number(formData.get("paxAffected"))
    : null;

  await prisma.practiceChange.create({
    data: {
      practiceId,
      kind: "VARIATION",
      title,
      detail,
      sellDelta,
      costDelta,
      paxAffected,
      sellBase: practice.totalSell,
      daysToDeparture: practice.departureDate
        ? Math.ceil(
            (practice.departureDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          )
        : null,
      createdByUserId: user.id,
    },
  });

  if (sellDelta !== 0 || costDelta !== 0) {
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        totalSell: practice.totalSell + sellDelta,
        totalCost: practice.totalCost + costDelta,
        marginPct:
          practice.totalSell + sellDelta > 0
            ? ((practice.totalSell + sellDelta - (practice.totalCost + costDelta)) /
                (practice.totalSell + sellDelta)) *
              100
            : 0,
        ...(groupageDepositRefresh(practice.totalSell + sellDelta, practice.groupageOver20 || practice.paxCount > 20)),
      },
    });
  }

  redirect(`/app/pratiche/${practiceId}`);
}

function groupageDepositRefresh(totalSell: number, groupageOver20: boolean) {
  const d = suggestedDeposit(totalSell, groupageOver20);
  return {
    groupageOver20,
    depositPct: d.pct,
    depositAmount: d.amount,
  };
}

export async function cancelPracticeServices(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const practiceId = String(formData.get("practiceId") || "");
  const mode = String(formData.get("mode") || "FULL"); // FULL | PARTIAL
  const practice = await loadPractice(practiceId, membership.organizationId);
  if (!practice) redirect("/app/pratiche");

  const lineId = String(formData.get("lineId") || "") || null;
  let cancelledSell = practice.totalSell;
  let cancelledCost = practice.totalCost;
  let title = "Cancellazione totale pratica";
  let kind: "FULL_CANCEL" | "PARTIAL_CANCEL" = "FULL_CANCEL";

  if (mode === "PARTIAL" && lineId) {
    const line = practice.lines.find((l) => l.id === lineId);
    if (!line) redirect(`/app/pratiche/${practiceId}`);
    cancelledSell = line.sellPrice * line.quantity;
    cancelledCost = line.netCost * line.quantity;
    title = `Cancellazione servizio: ${line.title}`;
    kind = "PARTIAL_CANCEL";
  }

  const penalty = computeCancellationPenalty({
    departureDate: practice.departureDate,
    groupageOver20: practice.groupageOver20 || practice.paxCount > 20,
    releaseDays: practice.releaseDays || 120,
    confirmedAt: practice.confirmedAt,
    cancelledSell,
    depositAmount: practice.depositAmount,
  });

  await prisma.practiceChange.create({
    data: {
      practiceId,
      kind,
      title,
      detail: penalty.explanation,
      sellBase: cancelledSell,
      sellDelta: -cancelledSell,
      costDelta: -cancelledCost,
      penaltyPct: penalty.band.pct,
      penaltyAmount: penalty.penaltyAmount,
      daysToDeparture: penalty.daysToDeparture,
      lineId,
      createdByUserId: user.id,
    },
  });

  if (kind === "PARTIAL_CANCEL" && lineId) {
    await prisma.practiceLine.update({
      where: { id: lineId },
      data: { status: "CANCELLED", notes: `Annullato · penale € ${penalty.penaltyAmount}` },
    });
    const lines = await prisma.practiceLine.findMany({ where: { practiceId } });
    const active = lines.filter((l) => l.status !== "CANCELLED");
    const totals = recalcTotals(active);
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        ...totals,
        ...groupageDepositRefresh(totals.totalSell, practice.groupageOver20 || practice.paxCount > 20),
      },
    });
  } else {
    await prisma.practiceLine.updateMany({
      where: { practiceId },
      data: { status: "CANCELLED" },
    });
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        status: "CANCELLED",
        totalSell: penalty.penaltyAmount,
        totalCost: 0,
        marginPct: 100,
        notes: [practice.notes, `Cancellata: ${penalty.explanation}`].filter(Boolean).join("\n\n"),
      },
    });
  }

  redirect(`/app/pratiche/${practiceId}`);
}

export async function generatePracticeDocument(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const practiceId = String(formData.get("practiceId") || "");
  const type = String(formData.get("type") || "VOUCHER") as PracticeDocType;
  const practice = await loadPractice(practiceId, membership.organizationId);
  if (!practice) redirect("/app/pratiche");

  let built: { title: string; bodyHtml: string };
  if (type === "FOGLIO_NOTIZIE") {
    built = buildFoglioNotizieHtml(practice);
  } else if (type === "CONFERMA") {
    const penalty = computeCancellationPenalty({
      departureDate: practice.departureDate,
      groupageOver20: practice.groupageOver20 || practice.paxCount > 20,
      releaseDays: practice.releaseDays || 120,
      confirmedAt: practice.confirmedAt || new Date(),
      cancelledSell: practice.totalSell,
      depositAmount: practice.depositAmount,
    });
    built = buildConfermaHtml(practice, penalty.explanation);
  } else {
    built = buildVoucherHtml(practice);
  }

  const last = await prisma.practiceDocument.findFirst({
    where: { practiceId, type },
    orderBy: { version: "desc" },
  });
  const version = (last?.version || 0) + 1;

  const doc = await prisma.practiceDocument.create({
    data: {
      practiceId,
      type,
      title: `${built.title} v${version}`,
      bodyHtml: built.bodyHtml,
      version,
      generatedByUserId: user.id,
    },
  });

  redirect(`/app/pratiche/${practiceId}/documenti/${doc.id}`);
}

export async function previewPenalty(formData: FormData) {
  // unused as server action redirect helper — kept for future JSON route
  void formData;
}
