import type { Brand, Campaign, Lead, Practice, Quote } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BrandMetrics = {
  leadsTotal: number;
  leadsOpen: number;
  leadsWon: number;
  quotesTotal: number;
  quotesAccepted: number;
  pipelineValue: number;
  wonRevenue: number;
  avgMarginPct: number;
  conversionLeadToQuote: number;
  conversionQuoteToWon: number;
  campaignsLive: number;
  campaignSpend: number;
  campaignAttributedRevenue: number;
  sitesPublished: number;
  siteViews: number;
  siteFormSubmits: number;
  bySource: { source: string; count: number }[];
  byStage: { stage: string; count: number }[];
};

export async function computeBrandMetrics(brandId: string, orgId: string): Promise<BrandMetrics> {
  const [leads, quotes, practices, campaigns, sites] = await Promise.all([
    prisma.lead.findMany({ where: { organizationId: orgId, brandId } }),
    prisma.quote.findMany({ where: { organizationId: orgId, brandId } }),
    prisma.practice.findMany({
      where: {
        organizationId: orgId,
        brandId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      },
    }),
    prisma.campaign.findMany({ where: { organizationId: orgId, brandId } }),
    prisma.brandSite.findMany({ where: { organizationId: orgId, brandId } }),
  ]);

  return rollupMetrics({ leads, quotes, practices, campaigns, sites });
}

export function rollupMetrics(input: {
  leads: Lead[];
  quotes: Quote[];
  practices: Practice[];
  campaigns: Campaign[];
  sites: { status: string; views: number; formSubmits: number }[];
}): BrandMetrics {
  const { leads, quotes, practices, campaigns, sites } = input;
  const leadsOpen = leads.filter((l) => !["WON", "LOST"].includes(l.pipelineStage)).length;
  const leadsWon = leads.filter((l) => l.pipelineStage === "WON").length;
  const quotesAccepted = quotes.filter((q) => q.status === "ACCEPTED").length;
  const pipelineValue = quotes
    .filter((q) => ["DRAFT", "SENT"].includes(q.status))
    .reduce((s, q) => s + q.totalSell, 0);
  const wonRevenue = practices.reduce((s, p) => s + p.totalSell, 0);
  const avgMarginPct =
    practices.length === 0
      ? 0
      : practices.reduce((s, p) => s + p.marginPct, 0) / practices.length;

  const bySourceMap = new Map<string, number>();
  for (const l of leads) {
    bySourceMap.set(l.source, (bySourceMap.get(l.source) || 0) + 1);
  }
  const byStageMap = new Map<string, number>();
  for (const l of leads) {
    byStageMap.set(l.pipelineStage, (byStageMap.get(l.pipelineStage) || 0) + 1);
  }

  const campaignSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const campaignAttributedRevenue = campaigns.reduce((s, c) => s + c.revenueAttributed, 0);

  return {
    leadsTotal: leads.length,
    leadsOpen,
    leadsWon,
    quotesTotal: quotes.length,
    quotesAccepted,
    pipelineValue,
    wonRevenue,
    avgMarginPct,
    conversionLeadToQuote: leads.length ? (quotes.length / leads.length) * 100 : 0,
    conversionQuoteToWon: quotes.length ? (quotesAccepted / quotes.length) * 100 : 0,
    campaignsLive: campaigns.filter((c) => c.status === "LIVE").length,
    campaignSpend,
    campaignAttributedRevenue,
    sitesPublished: sites.filter((s) => s.status === "PUBLISHED").length,
    siteViews: sites.reduce((s, x) => s + x.views, 0),
    siteFormSubmits: sites.reduce((s, x) => s + x.formSubmits, 0),
    bySource: [...bySourceMap.entries()].map(([source, count]) => ({ source, count })),
    byStage: [...byStageMap.entries()].map(([stage, count]) => ({ stage, count })),
  };
}

export function brandPublicPath(brand: Pick<Brand, "slug">, siteSlug: string) {
  return `/s/${brand.slug}/${siteSlug}`;
}

export type SiteBlock =
  | { type: "hero"; title: string; subtitle?: string; ctaLabel?: string }
  | { type: "features"; items: { title: string; text: string }[] }
  | { type: "itinerary"; days: { title: string; text: string }[] }
  | { type: "form"; title: string; fields: string[] }
  | { type: "trust"; items: string[] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "gallery"; items: { caption: string }[] }
  | { type: "cta"; title: string; subtitle?: string; ctaLabel?: string }
  | { type: "text"; title?: string; body: string };

export function defaultLandingBlocks(brandName: string): SiteBlock[] {
  // Prefer the FIT template as the default builder starting point.
  // Imported lazily-style via require pattern avoided; duplicated minimal set for circular-import safety.
  return [
    {
      type: "hero",
      title: `Viaggia in Cina con ${brandName}`,
      subtitle: "Ipotesi di land su misura — non un programma chiuso.",
      ctaLabel: "Richiedi preventivo",
    },
    {
      type: "features",
      items: [
        { title: "Listino proprio + API", text: "Quote chiuse, hotel e servizi aggiornabili." },
        { title: "Assistenza IT", text: "Ufficio booking italiano e backoffice in Cina." },
        { title: "WeChat 24h", text: "Assistenza sugli imprevisti del viaggio organizzato." },
      ],
    },
    {
      type: "itinerary",
      days: [
        { title: "Pechino", text: "Città Proibita, Muraglia, guida in italiano." },
        { title: "Xi’an", text: "Esercito di terracotta, guida in italiano." },
        { title: "Shanghai", text: "Bund e quartieri contemporanei con accompagnatore IT." },
      ],
    },
    {
      type: "form",
      title: "Raccontaci cosa cercate",
      fields: ["nome", "email", "pax", "periodo", "messaggio"],
    },
    {
      type: "trust",
      items: ["Validità preventivo 7 giorni", "Ipotesi senza budget, ricalibrabile", "Multi-brand Yoyiyo"],
    },
  ];
}

/** Validate / normalize blocks JSON from the editor. */
export function parseSiteBlocks(raw: string | null | undefined, brandName: string): SiteBlock[] {
  if (!raw?.trim()) return defaultLandingBlocks(brandName);
  try {
    const parsed = JSON.parse(raw) as SiteBlock[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultLandingBlocks(brandName);
    return parsed.filter((b) => b && typeof b === "object" && "type" in b);
  } catch {
    return defaultLandingBlocks(brandName);
  }
}

export function countBlockTypes(blocks: SiteBlock[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of blocks) {
    out[b.type] = (out[b.type] || 0) + 1;
  }
  return out;
}

/** Flatten blocks into simple form defaults for non-technical editors. */
export function siteBlocksToSimpleFields(blocksJson: string | null | undefined, brandName: string) {
  let blocks = defaultLandingBlocks(brandName);
  if (blocksJson) {
    try {
      blocks = JSON.parse(blocksJson) as SiteBlock[];
    } catch {
      /* keep defaults */
    }
  }
  const hero = blocks.find((b) => b.type === "hero");
  const features = blocks.find((b) => b.type === "features");
  const itinerary = blocks.find((b) => b.type === "itinerary");
  const form = blocks.find((b) => b.type === "form");
  const trust = blocks.find((b) => b.type === "trust");
  const faq = blocks.find((b) => b.type === "faq");
  const gallery = blocks.find((b) => b.type === "gallery");
  const cta = blocks.find((b) => b.type === "cta");
  const text = blocks.find((b) => b.type === "text");

  return {
    heroTitle: hero && hero.type === "hero" ? hero.title : "",
    heroSubtitle: hero && hero.type === "hero" ? hero.subtitle || "" : "",
    feature1Title: features && features.type === "features" ? features.items[0]?.title || "" : "",
    feature1Text: features && features.type === "features" ? features.items[0]?.text || "" : "",
    feature2Title: features && features.type === "features" ? features.items[1]?.title || "" : "",
    feature2Text: features && features.type === "features" ? features.items[1]?.text || "" : "",
    feature3Title: features && features.type === "features" ? features.items[2]?.title || "" : "",
    feature3Text: features && features.type === "features" ? features.items[2]?.text || "" : "",
    day1Title: itinerary && itinerary.type === "itinerary" ? itinerary.days[0]?.title || "" : "",
    day1Text: itinerary && itinerary.type === "itinerary" ? itinerary.days[0]?.text || "" : "",
    day2Title: itinerary && itinerary.type === "itinerary" ? itinerary.days[1]?.title || "" : "",
    day2Text: itinerary && itinerary.type === "itinerary" ? itinerary.days[1]?.text || "" : "",
    day3Title: itinerary && itinerary.type === "itinerary" ? itinerary.days[2]?.title || "" : "",
    day3Text: itinerary && itinerary.type === "itinerary" ? itinerary.days[2]?.text || "" : "",
    formTitle: form && form.type === "form" ? form.title : "Raccontaci cosa cercate",
    trustItems: trust && trust.type === "trust" ? trust.items.join("\n") : "",
    faq1Q: faq && faq.type === "faq" ? faq.items[0]?.q || "" : "",
    faq1A: faq && faq.type === "faq" ? faq.items[0]?.a || "" : "",
    faq2Q: faq && faq.type === "faq" ? faq.items[1]?.q || "" : "",
    faq2A: faq && faq.type === "faq" ? faq.items[1]?.a || "" : "",
    galleryCaptions:
      gallery && gallery.type === "gallery"
        ? gallery.items.map((i) => i.caption).join("\n")
        : "",
    ctaTitle: cta && cta.type === "cta" ? cta.title : "",
    ctaSubtitle: cta && cta.type === "cta" ? cta.subtitle || "" : "",
    textTitle: text && text.type === "text" ? text.title || "" : "",
    textBody: text && text.type === "text" ? text.body : "",
  };
}
