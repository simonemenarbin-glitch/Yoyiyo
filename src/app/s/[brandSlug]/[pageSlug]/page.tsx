import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteRenderer } from "@/components/brand/PublicSiteRenderer";
import {
  defaultLandingBlocks,
  type SiteBlock,
} from "@/lib/brand/metrics";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brandSlug: string; pageSlug: string }>;
}): Promise<Metadata> {
  await ensureDatabase();
  const { brandSlug, pageSlug } = await params;
  const brand = await prisma.brand.findFirst({ where: { slug: brandSlug } });
  if (!brand) return { title: "Pagina non trovata" };
  const site = await prisma.brandSite.findFirst({
    where: { brandId: brand.id, slug: pageSlug, status: "PUBLISHED" },
  });
  if (!site) return { title: brand.name };
  return {
    title: site.title || brand.seoTitle || brand.name,
    description: site.subtitle || brand.seoDescription || brand.tagline || undefined,
  };
}

export default async function PublicBrandSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ brandSlug: string; pageSlug: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  await ensureDatabase();
  const { brandSlug, pageSlug } = await params;
  const sp = await searchParams;

  const brand = await prisma.brand.findFirst({
    where: { slug: brandSlug, status: "ACTIVE" },
  });
  if (!brand) notFound();

  const site = await prisma.brandSite.findFirst({
    where: { brandId: brand.id, slug: pageSlug, status: "PUBLISHED" },
  });
  if (!site) notFound();

  // fire-and-forget view counter (awaited so SQLite stays consistent)
  await prisma.brandSite.update({
    where: { id: site.id },
    data: { views: { increment: 1 } },
  });

  let blocks: SiteBlock[] = defaultLandingBlocks(brand.name);
  if (site.blocksJson) {
    try {
      blocks = JSON.parse(site.blocksJson) as SiteBlock[];
    } catch {
      blocks = defaultLandingBlocks(brand.name);
    }
  }

  // ensure there is a form block for lead capture
  if (!blocks.some((b) => b.type === "form")) {
    blocks = [
      ...blocks,
      {
        type: "form",
        title: "Raccontaci cosa cercate",
        fields: ["nome", "email", "pax", "periodo", "messaggio"],
      },
    ];
  }

  return (
    <PublicSiteRenderer
      brandName={brand.name}
      brandSlug={brand.slug}
      pageSlug={site.slug}
      primaryColor={brand.primaryColor}
      secondaryColor={brand.secondaryColor}
      title={site.title}
      subtitle={site.subtitle}
      ctaLabel={site.ctaLabel}
      blocks={blocks}
      showThanks={sp.ok === "1"}
    />
  );
}
