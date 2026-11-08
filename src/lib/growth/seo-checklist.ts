import type { Brand, BrandSite } from "@prisma/client";

export type SeoCheckId =
  | "title"
  | "meta_description"
  | "slug"
  | "hero"
  | "cta"
  | "form_lead"
  | "brand_colors"
  | "utm_campaign"
  | "published";

export type SeoCheck = {
  id: SeoCheckId;
  label: string;
  ok: boolean;
  hint: string;
};

export function runSeoChecklist(input: {
  brand: Pick<Brand, "name" | "primaryColor" | "secondaryColor" | "seoTitle" | "seoDescription" | "tagline">;
  site: Pick<
    BrandSite,
    "title" | "subtitle" | "slug" | "ctaLabel" | "status" | "blocksJson" | "campaignId"
  >;
  campaignUtm?: string | null;
}): { score: number; checks: SeoCheck[] } {
  const { brand, site } = input;
  let blocks: { type?: string; title?: string }[] = [];
  try {
    blocks = site.blocksJson ? (JSON.parse(site.blocksJson) as typeof blocks) : [];
  } catch {
    blocks = [];
  }

  const hasHero = blocks.some((b) => b.type === "hero" && (b.title || "").trim().length > 0);
  const hasForm = blocks.some((b) => b.type === "form");
  const titleOk = Boolean((site.title || brand.seoTitle || "").trim());
  const descOk = Boolean((site.subtitle || brand.seoDescription || brand.tagline || "").trim());
  const slugOk = Boolean(site.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug));
  const ctaOk = Boolean((site.ctaLabel || "").trim());
  const colorsOk = Boolean(brand.primaryColor && brand.secondaryColor);
  const utmOk = Boolean(site.campaignId || input.campaignUtm);
  const publishedOk = site.status === "PUBLISHED";

  const checks: SeoCheck[] = [
    {
      id: "title",
      label: "Titolo SEO / pagina",
      ok: titleOk,
      hint: titleOk ? "Presente" : "Imposta title in editor o seoTitle sul brand",
    },
    {
      id: "meta_description",
      label: "Meta description / sottotitolo",
      ok: descOk,
      hint: descOk ? "Presente" : "Aggiungi subtitle o seoDescription",
    },
    {
      id: "slug",
      label: "Slug URL pulito",
      ok: slugOk,
      hint: slugOk ? site.slug : "Solo minuscole, numeri e trattini",
    },
    {
      id: "hero",
      label: "Blocco hero con titolo",
      ok: hasHero,
      hint: hasHero ? "OK" : "Aggiungi blocco hero",
    },
    {
      id: "cta",
      label: "CTA chiara",
      ok: ctaOk,
      hint: ctaOk ? site.ctaLabel || "" : "Imposta testo pulsante",
    },
    {
      id: "form_lead",
      label: "Form lead capture",
      ok: hasForm,
      hint: hasForm ? "Form → CRM" : "Aggiungi blocco form",
    },
    {
      id: "brand_colors",
      label: "Colori brand",
      ok: colorsOk,
      hint: colorsOk ? "OK" : "Definisci colori sul marchio",
    },
    {
      id: "utm_campaign",
      label: "Campagna / UTM collegata",
      ok: utmOk,
      hint: utmOk ? "Attribuzione attiva" : "Collega una campagna ads/landing",
    },
    {
      id: "published",
      label: "Pagina pubblicata",
      ok: publishedOk,
      hint: publishedOk ? "Live" : "Pubblica la landing",
    },
  ];

  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}
