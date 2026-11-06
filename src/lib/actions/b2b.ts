"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PartnerNetKind, ProductType } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPartnerLinePrices, randomPortalToken } from "@/lib/b2b/pricing";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  return { orgId: membership.organizationId };
}

export async function createPartnerNet(formData: FormData) {
  const { orgId } = await requireOrg();
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
  const name = String(formData.get("name") || "").trim();
  if (!code || !name) throw new Error("Codice e nome obbligatori");

  await prisma.partnerNet.create({
    data: {
      organizationId: orgId,
      code,
      name,
      kind: (String(formData.get("kind") || "STANDARD") as PartnerNetKind) || "STANDARD",
      defaultMarkupPct: Number(formData.get("defaultMarkupPct") || 10),
      defaultCommissionPct: Number(formData.get("defaultCommissionPct") || 10),
      notes: String(formData.get("notes") || "") || null,
    },
  });
  revalidatePath("/app/b2b");
}

export async function createAgencyPartner(formData: FormData) {
  const { orgId } = await requireOrg();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Nome obbligatorio");
  const netId = String(formData.get("netId") || "") || null;
  const enablePortal = String(formData.get("portalEnabled") || "") === "1";

  await prisma.agencyPartner.create({
    data: {
      organizationId: orgId,
      netId,
      name,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      contactName: String(formData.get("contactName") || "") || null,
      city: String(formData.get("city") || "") || null,
      commissionPct: Number(formData.get("commissionPct") || 10),
      portalEnabled: enablePortal,
      portalToken: enablePortal ? randomPortalToken() : null,
    },
  });
  revalidatePath("/app/b2b");
}

export async function togglePartnerPortal(formData: FormData) {
  const { orgId } = await requireOrg();
  const partnerId = String(formData.get("partnerId") || "");
  const partner = await prisma.agencyPartner.findFirst({
    where: { id: partnerId, organizationId: orgId },
  });
  if (!partner) throw new Error("Partner non trovato");

  const enable = !partner.portalEnabled;
  await prisma.agencyPartner.update({
    where: { id: partner.id },
    data: {
      portalEnabled: enable,
      portalToken: enable ? partner.portalToken || randomPortalToken() : partner.portalToken,
    },
  });
  revalidatePath("/app/b2b");
}

export async function createPriceList(formData: FormData) {
  const { orgId } = await requireOrg();
  const name = String(formData.get("name") || "").trim() || "Listino partner";
  const netId = String(formData.get("netId") || "") || null;
  const partnerId = String(formData.get("partnerId") || "") || null;

  const list = await prisma.partnerPriceList.create({
    data: {
      organizationId: orgId,
      name,
      netId,
      partnerId,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  redirect(`/app/b2b/listini/${list.id}`);
}

export async function addPriceListLine(formData: FormData) {
  const { orgId } = await requireOrg();
  const priceListId = String(formData.get("priceListId") || "");
  const list = await prisma.partnerPriceList.findFirst({
    where: { id: priceListId, organizationId: orgId },
    include: { net: true, partner: { include: { net: true } } },
  });
  if (!list) throw new Error("Listino non trovato");

  const productId = String(formData.get("productId") || "") || null;
  let title = String(formData.get("title") || "").trim();
  let serviceType = (String(formData.get("serviceType") || "OTHER") as ProductType) || "OTHER";
  let netCost = Number(formData.get("netCost") || 0);

  if (productId) {
    const product = await prisma.catalogProduct.findFirst({
      where: { id: productId, organizationId: orgId },
      include: { ratePlans: true },
    });
    if (product) {
      title = title || product.name;
      serviceType = product.type;
      if (!netCost && product.ratePlans[0]) netCost = product.ratePlans[0].netCost;
    }
  }

  const toCommission =
    Number(formData.get("toCommissionPct") || 0) ||
    list.net?.defaultCommissionPct ||
    list.partner?.net?.defaultCommissionPct ||
    list.partner?.commissionPct ||
    10;
  const partnerMarkup =
    Number(formData.get("partnerMarkupPct") || 0) ||
    list.net?.defaultMarkupPct ||
    list.partner?.net?.defaultMarkupPct ||
    10;

  const prices = buildPartnerLinePrices({
    netCost,
    toCommissionPct: toCommission,
    partnerMarkupPct: partnerMarkup,
  });

  await prisma.partnerPriceLine.create({
    data: {
      priceListId,
      productId,
      title: title || "Voce listino",
      serviceType,
      netCost,
      agencyNet: Number(formData.get("agencyNet") || prices.agencyNet),
      suggestedSell: Number(formData.get("suggestedSell") || prices.suggestedSell),
      notes: String(formData.get("notes") || "") || null,
    },
  });

  revalidatePath(`/app/b2b/listini/${priceListId}`);
}

export async function seedPriceListFromCatalog(formData: FormData) {
  const { orgId } = await requireOrg();
  const priceListId = String(formData.get("priceListId") || "");
  const list = await prisma.partnerPriceList.findFirst({
    where: { id: priceListId, organizationId: orgId },
    include: { net: true, partner: { include: { net: true } } },
  });
  if (!list) throw new Error("Listino non trovato");

  const toCommission =
    list.net?.defaultCommissionPct ||
    list.partner?.net?.defaultCommissionPct ||
    list.partner?.commissionPct ||
    10;
  const partnerMarkup =
    list.net?.defaultMarkupPct || list.partner?.net?.defaultMarkupPct || 10;

  const products = await prisma.catalogProduct.findMany({
    where: { organizationId: orgId, active: true, priceSource: "OWN_LIST" },
    include: { ratePlans: true },
    take: 40,
  });

  for (const p of products) {
    const rate = p.ratePlans[0];
    if (!rate) continue;
    const prices = buildPartnerLinePrices({
      netCost: rate.netCost,
      toCommissionPct: toCommission,
      partnerMarkupPct: partnerMarkup,
    });
    await prisma.partnerPriceLine.create({
      data: {
        priceListId,
        productId: p.id,
        title: p.name,
        serviceType: p.type,
        netCost: rate.netCost,
        agencyNet: prices.agencyNet,
        suggestedSell: prices.suggestedSell,
      },
    });
  }

  revalidatePath(`/app/b2b/listini/${priceListId}`);
}
