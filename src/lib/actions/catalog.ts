"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AllotmentUnit, PolicyKind, ProductType, SupplementKind } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  return { user, membership, orgId: membership.organizationId };
}

async function assertProduct(orgId: string, productId: string) {
  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, organizationId: orgId },
  });
  if (!product) throw new Error("Prodotto non trovato");
  return product;
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createCatalogProduct(formData: FormData) {
  const { orgId } = await requireOrg();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Nome obbligatorio");
  const type = String(formData.get("type") || "HOTEL") as ProductType;
  const city = String(formData.get("city") || "") || null;
  const code = String(formData.get("code") || "") || null;
  const netCost = Number(formData.get("netCost") || 0);
  const sellPrice = Number(formData.get("sellPrice") || 0);

  const product = await prisma.catalogProduct.create({
    data: {
      organizationId: orgId,
      name,
      type,
      city,
      code,
      country: "Cina",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "Tariffa base",
          netCost,
          sellPrice,
        },
      },
    },
  });

  redirect(`/app/catalogo/${product.id}`);
}

export async function addContractPeriod(formData: FormData) {
  const { orgId } = await requireOrg();
  const productId = String(formData.get("productId") || "");
  await assertProduct(orgId, productId);

  const name = String(formData.get("name") || "").trim() || "Periodo";
  const validFrom = parseDate(formData.get("validFrom"));
  const validTo = parseDate(formData.get("validTo"));
  if (!validFrom || !validTo) throw new Error("Date periodo obbligatorie");

  await prisma.contractPeriod.create({
    data: {
      productId,
      name,
      validFrom,
      validTo,
      netCost: Number(formData.get("netCost") || 0),
      sellPrice: Number(formData.get("sellPrice") || 0),
      minStay: Math.max(1, Number(formData.get("minStay") || 1)),
      bookableUntil: parseDate(formData.get("bookableUntil")),
      notes: String(formData.get("notes") || "") || null,
    },
  });

  revalidatePath(`/app/catalogo/${productId}`);
}

export async function addRateSupplement(formData: FormData) {
  const { orgId } = await requireOrg();
  const productId = String(formData.get("productId") || "");
  await assertProduct(orgId, productId);

  const periodId = String(formData.get("periodId") || "") || null;
  await prisma.rateSupplement.create({
    data: {
      productId,
      periodId,
      kind: (String(formData.get("kind") || "OTHER") as SupplementKind) || "OTHER",
      name: String(formData.get("name") || "").trim() || "Supplemento",
      amount: Number(formData.get("amount") || 0),
      isPercent: String(formData.get("isPercent") || "") === "1",
      perNight: String(formData.get("perNight") || "1") !== "0",
      perPerson: String(formData.get("perPerson") || "") === "1",
      validFrom: parseDate(formData.get("validFrom")),
      validTo: parseDate(formData.get("validTo")),
    },
  });

  revalidatePath(`/app/catalogo/${productId}`);
}

export async function addAllotmentBucket(formData: FormData) {
  const { orgId } = await requireOrg();
  const productId = String(formData.get("productId") || "");
  await assertProduct(orgId, productId);

  await prisma.allotmentBucket.create({
    data: {
      productId,
      periodId: String(formData.get("periodId") || "") || null,
      name: String(formData.get("name") || "").trim() || "Allotment",
      unit: (String(formData.get("unit") || "ROOM") as AllotmentUnit) || "ROOM",
      totalUnits: Math.max(0, Number(formData.get("totalUnits") || 0)),
      releasedUnits: Math.max(0, Number(formData.get("releasedUnits") || 0)),
      bookedUnits: Math.max(0, Number(formData.get("bookedUnits") || 0)),
      releaseDays: Math.max(0, Number(formData.get("releaseDays") || 21)),
      freeSale: String(formData.get("freeSale") || "") === "1",
      notes: String(formData.get("notes") || "") || null,
    },
  });

  revalidatePath(`/app/catalogo/${productId}`);
}

export async function bookAllotmentDemo(formData: FormData) {
  const { orgId } = await requireOrg();
  const productId = String(formData.get("productId") || "");
  await assertProduct(orgId, productId);
  const allotmentId = String(formData.get("allotmentId") || "");
  const qty = Math.max(1, Number(formData.get("qty") || 1));

  const bucket = await prisma.allotmentBucket.findFirst({
    where: { id: allotmentId, productId },
  });
  if (!bucket) throw new Error("Allotment non trovato");

  const remaining = bucket.totalUnits - bucket.releasedUnits - bucket.bookedUnits;
  if (!bucket.freeSale && remaining < qty) {
    throw new Error(`Disponibilità insufficiente (${remaining})`);
  }

  await prisma.allotmentBucket.update({
    where: { id: bucket.id },
    data: { bookedUnits: bucket.bookedUnits + qty },
  });

  revalidatePath(`/app/catalogo/${productId}`);
}

export async function addContractPolicy(formData: FormData) {
  const { orgId } = await requireOrg();
  const productId = String(formData.get("productId") || "") || null;
  if (productId) await assertProduct(orgId, productId);

  await prisma.contractPolicy.create({
    data: {
      organizationId: orgId,
      productId,
      kind: (String(formData.get("kind") || "CANCELLATION") as PolicyKind) || "CANCELLATION",
      name: String(formData.get("name") || "").trim() || "Policy",
      bodyText: String(formData.get("bodyText") || "").trim() || "—",
      daysBefore: formData.get("daysBefore") ? Number(formData.get("daysBefore")) : null,
      penaltyPct: formData.get("penaltyPct") ? Number(formData.get("penaltyPct")) : null,
      depositPct: formData.get("depositPct") ? Number(formData.get("depositPct")) : null,
    },
  });

  if (productId) revalidatePath(`/app/catalogo/${productId}`);
  else revalidatePath("/app/catalogo");
}
