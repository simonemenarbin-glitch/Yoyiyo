"use server";

import { redirect } from "next/navigation";
import type {
  BrandStatus,
  CampaignChannel,
  CampaignStatus,
  SitePageStatus,
  SitePageType,
} from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultLandingBlocks, parseSiteBlocks } from "@/lib/brand/metrics";
import { applyLandingTemplate } from "@/lib/brand/templates";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function upsertBrand(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));

  const data = {
    name,
    slug,
    status: (String(formData.get("status") || "ACTIVE") as BrandStatus) || "ACTIVE",
    tagline: String(formData.get("tagline") || "") || null,
    primaryColor: String(formData.get("primaryColor") || "#0F3D3E"),
    secondaryColor: String(formData.get("secondaryColor") || "#B33A2B"),
    domain: String(formData.get("domain") || "") || null,
    websiteUrl: String(formData.get("websiteUrl") || "") || null,
    seoTitle: String(formData.get("seoTitle") || "") || null,
    seoDescription: String(formData.get("seoDescription") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    socialJson: JSON.stringify({
      instagram: String(formData.get("instagram") || ""),
      facebook: String(formData.get("facebook") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
    }),
  };

  if (id) {
    await prisma.brand.updateMany({
      where: { id, organizationId: orgId },
      data,
    });
    redirect(`/app/marchi/${id}`);
  }

  const brand = await prisma.brand.create({
    data: { organizationId: orgId, ...data },
  });
  redirect(`/app/marchi/${brand.id}`);
}

export async function upsertCampaign(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");

  const data = {
    name: String(formData.get("name") || "").trim(),
    channel: (String(formData.get("channel") || "LANDING") as CampaignChannel) || "LANDING",
    status: (String(formData.get("status") || "DRAFT") as CampaignStatus) || "DRAFT",
    goal: String(formData.get("goal") || "") || null,
    utmCampaign: String(formData.get("utmCampaign") || "") || null,
    utmSource: String(formData.get("utmSource") || "") || null,
    utmMedium: String(formData.get("utmMedium") || "") || null,
    budget: Number(formData.get("budget") || 0),
    spend: Number(formData.get("spend") || 0),
    impressions: Number(formData.get("impressions") || 0),
    clicks: Number(formData.get("clicks") || 0),
    notes: String(formData.get("notes") || "") || null,
    startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
    endAt: formData.get("endAt") ? new Date(String(formData.get("endAt"))) : null,
  };

  if (id) {
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) redirect(`/app/marchi/${brandId}/campagne`);
    await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        name: data.name || existing.name,
      },
    });
  } else {
    await prisma.campaign.create({
      data: { organizationId: orgId, brandId, ...data },
    });
  }
  redirect(`/app/marchi/${brandId}/campagne`);
}

export async function createBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const brandId = String(formData.get("brandId") || "");
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId: orgId },
  });
  if (!brand) redirect("/app/marchi");

  const templateId = String(formData.get("templateId") || "") || null;
  const applied = templateId ? applyLandingTemplate(templateId, brand.name) : null;

  const name = String(formData.get("name") || applied?.name || "Landing").trim();
  const slug =
    slugify(String(formData.get("slug") || applied?.suggestedSlug || name)) || "landing";
  const campaignId = String(formData.get("campaignId") || "") || null;

  const site = await prisma.brandSite.create({
    data: {
      organizationId: orgId,
      brandId,
      campaignId,
      name,
      slug,
      pageType:
        (String(formData.get("pageType") || applied?.pageType || "LANDING") as SitePageType) ||
        "LANDING",
      status: "DRAFT",
      title: String(formData.get("title") || name),
      subtitle: String(formData.get("subtitle") || brand.tagline || "") || null,
      ctaLabel: String(formData.get("ctaLabel") || applied?.ctaLabel || "Richiedi preventivo"),
      blocksJson: JSON.stringify(applied?.blocks || defaultLandingBlocks(brand.name)),
    },
  });

  redirect(`/app/marchi/${brandId}/siti/${site.id}`);
}

export async function applyTemplateToBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");
  const templateId = String(formData.get("templateId") || "");

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId: orgId },
  });
  if (!brand) redirect("/app/marchi");

  const applied = applyLandingTemplate(templateId, brand.name);
  if (!applied) redirect(`/app/marchi/${brandId}/siti/${id}?err=template`);

  await prisma.brandSite.updateMany({
    where: { id, organizationId: orgId },
    data: {
      blocksJson: JSON.stringify(applied.blocks),
      pageType: applied.pageType,
      ctaLabel: applied.ctaLabel,
      status: "DRAFT",
      publishedAt: null,
    },
  });
  redirect(`/app/marchi/${brandId}/siti/${id}?saved=1`);
}

export async function cloneBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");

  const source = await prisma.brandSite.findFirst({
    where: { id, brandId, organizationId: orgId },
  });
  if (!source) redirect(`/app/marchi/${brandId}/siti`);

  const clone = await prisma.brandSite.create({
    data: {
      organizationId: orgId,
      brandId,
      campaignId: source.campaignId,
      name: `${source.name} (copia)`,
      slug: `${source.slug}-copia-${Date.now().toString(36).slice(-4)}`,
      pageType: source.pageType,
      status: "DRAFT",
      title: source.title,
      subtitle: source.subtitle,
      ctaLabel: source.ctaLabel,
      ctaHref: source.ctaHref,
      heroImageUrl: source.heroImageUrl,
      blocksJson: source.blocksJson,
      customCss: source.customCss,
    },
  });
  redirect(`/app/marchi/${brandId}/siti/${clone.id}`);
}

export async function unpublishBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");

  await prisma.brandSite.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: { status: "DRAFT", publishedAt: null },
  });
  redirect(`/app/marchi/${brandId}/siti/${id}?saved=1`);
}

function blocksFromSimpleForm(formData: FormData, brandName: string) {
  const heroTitle = String(formData.get("heroTitle") || "").trim();
  const heroSubtitle = String(formData.get("heroSubtitle") || "").trim();
  const ctaLabel = String(formData.get("ctaLabel") || "Richiedi preventivo").trim();
  const formTitle = String(formData.get("formTitle") || "Raccontaci cosa cercate").trim();

  const features = [1, 2, 3]
    .map((n) => ({
      title: String(formData.get(`feature${n}Title`) || "").trim(),
      text: String(formData.get(`feature${n}Text`) || "").trim(),
    }))
    .filter((f) => f.title || f.text);

  const days = [1, 2, 3]
    .map((n) => ({
      title: String(formData.get(`day${n}Title`) || "").trim(),
      text: String(formData.get(`day${n}Text`) || "").trim(),
    }))
    .filter((d) => d.title || d.text);

  const trustRaw = String(formData.get("trustItems") || "").trim();
  const trustItems = trustRaw
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  const faq = [1, 2]
    .map((n) => ({
      q: String(formData.get(`faq${n}Q`) || "").trim(),
      a: String(formData.get(`faq${n}A`) || "").trim(),
    }))
    .filter((f) => f.q || f.a);

  const galleryCaptions = String(formData.get("galleryCaptions") || "")
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  const ctaTitle = String(formData.get("ctaTitle") || "").trim();
  const ctaSubtitle = String(formData.get("ctaSubtitle") || "").trim();
  const textTitle = String(formData.get("textTitle") || "").trim();
  const textBody = String(formData.get("textBody") || "").trim();

  const blocks = [
    {
      type: "hero" as const,
      title: heroTitle || `Viaggia in Cina con ${brandName}`,
      subtitle: heroSubtitle || undefined,
      ctaLabel: ctaLabel || undefined,
    },
    ...(features.length ? [{ type: "features" as const, items: features }] : []),
    ...(days.length ? [{ type: "itinerary" as const, days }] : []),
    ...(galleryCaptions.length
      ? [{ type: "gallery" as const, items: galleryCaptions.map((caption) => ({ caption })) }]
      : []),
    ...(textBody
      ? [{ type: "text" as const, title: textTitle || undefined, body: textBody }]
      : []),
    ...(ctaTitle
      ? [
          {
            type: "cta" as const,
            title: ctaTitle,
            subtitle: ctaSubtitle || undefined,
            ctaLabel: ctaLabel || undefined,
          },
        ]
      : []),
    {
      type: "form" as const,
      title: formTitle,
      fields: ["nome", "email", "pax", "periodo", "messaggio"],
    },
    ...(faq.length ? [{ type: "faq" as const, items: faq }] : []),
    ...(trustItems.length ? [{ type: "trust" as const, items: trustItems }] : []),
  ];

  return JSON.stringify(blocks);
}

export async function updateBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId: orgId },
  });
  if (!brand) redirect("/app/marchi");

  const status = (String(formData.get("status") || "DRAFT") as SitePageStatus) || "DRAFT";
  const editorMode = String(formData.get("editorMode") || "simple");
  let blocksJson: string | null = null;
  if (editorMode === "json") {
    const raw = String(formData.get("blocksJson") || "").trim();
    // Normalize via parse so invalid JSON falls back safely
    blocksJson = JSON.stringify(parseSiteBlocks(raw, brand.name));
  } else {
    blocksJson = blocksFromSimpleForm(formData, brand.name);
  }

  await prisma.brandSite.updateMany({
    where: { id, organizationId: orgId },
    data: {
      name: String(formData.get("name") || "").trim(),
      slug: slugify(String(formData.get("slug") || "page")),
      title: String(formData.get("title") || "").trim(),
      subtitle: String(formData.get("subtitle") || "") || null,
      ctaLabel: String(formData.get("ctaLabel") || "") || null,
      ctaHref: String(formData.get("ctaHref") || "") || null,
      campaignId: String(formData.get("campaignId") || "") || null,
      pageType: (String(formData.get("pageType") || "LANDING") as SitePageType) || "LANDING",
      status,
      blocksJson,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  redirect(`/app/marchi/${brandId}/siti/${id}?saved=1`);
}

export async function publishBrandSite(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const brandId = String(formData.get("brandId") || "");
  const id = String(formData.get("id") || "");

  await prisma.brandSite.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  redirect(`/app/marchi/${brandId}/siti/${id}?published=1`);
}

/** Public landing form → lead attributed to brand (+ campaign if linked). */
export async function submitBrandSiteLead(formData: FormData) {
  const brandSlug = String(formData.get("brandSlug") || "").trim();
  const pageSlug = String(formData.get("pageSlug") || "").trim();
  const brand = await prisma.brand.findFirst({
    where: { slug: brandSlug, status: "ACTIVE" },
  });
  if (!brand) redirect(`/s/${brandSlug}/${pageSlug}?err=brand`);

  const site = await prisma.brandSite.findFirst({
    where: { brandId: brand.id, slug: pageSlug, status: "PUBLISHED" },
    include: { campaign: true },
  });
  if (!site) redirect(`/s/${brandSlug}/${pageSlug}?err=site`);

  const fullName = String(formData.get("nome") || formData.get("name") || "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Lead";
  const lastName = parts.slice(1).join(" ") || "Web";
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("telefono") || formData.get("phone") || "").trim() || null;
  const paxCount = Number(formData.get("pax") || formData.get("paxCount") || 2) || 2;
  const periodo = String(formData.get("periodo") || "").trim();
  const messaggio = String(formData.get("messaggio") || formData.get("message") || "").trim();

  const utmSource = String(formData.get("utm_source") || site.campaign?.utmSource || "landing");
  const utmMedium = String(formData.get("utm_medium") || site.campaign?.utmMedium || "site");
  const utmCampaign =
    String(formData.get("utm_campaign") || site.campaign?.utmCampaign || site.slug);

  const interestBits = [site.title, periodo ? `periodo ${periodo}` : "", messaggio]
    .filter(Boolean)
    .join(" · ");

  const lead = await prisma.lead.create({
    data: {
      organizationId: brand.organizationId,
      brandId: brand.id,
      campaignId: site.campaignId,
      firstName,
      lastName,
      email,
      phone,
      source: "WEB",
      sourceDetail: `landing /s/${brand.slug}/${site.slug} · utm ${utmSource}/${utmMedium}/${utmCampaign}`,
      pipelineStage: "NEW",
      intakeStatus: "NEEDS_INFO",
      clientType: "B2C",
      pipelineName: site.title,
      interest: interestBits || site.title,
      paxCount,
      departureHint: periodo || null,
      rawSourceText: messaggio || null,
      missingFieldsJson: JSON.stringify(
        [!periodo ? "dates" : null, !messaggio ? "notes" : null].filter(Boolean),
      ),
      draftReply: `Buongiorno ${firstName},\n\ngrazie per la richiesta dal sito ${brand.name}.\nAbbiamo ricevuto: ${interestBits || "interesse generale"}.\n\nPer prepararvi un’ipotesi di lavoro chiusa nei numeri ci servono periodo e preferenze di ritmo/hotel. Appena ci rispondete, vi mandiamo una prima idea di partenza — non un programma chiuso.\n\nUfficio Booking / Yoyiyo`,
      notes: `Lead da landing ${site.name}`,
      lastActivityAt: new Date(),
    },
  });

  await prisma.brandSite.update({
    where: { id: site.id },
    data: { formSubmits: { increment: 1 } },
  });

  if (site.campaignId) {
    await prisma.campaign.update({
      where: { id: site.campaignId },
      data: { leadsCount: { increment: 1 } },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: brand.organizationId,
      action: "LEAD_FROM_LANDING",
      entityType: "Lead",
      entityId: lead.id,
      metaJson: JSON.stringify({
        brandId: brand.id,
        siteId: site.id,
        campaignId: site.campaignId,
        utmSource,
        utmMedium,
        utmCampaign,
      }),
    },
  });

  redirect(`/s/${brand.slug}/${site.slug}?ok=1`);
}
