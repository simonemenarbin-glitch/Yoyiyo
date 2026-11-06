import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { StatCard } from "@/components/StatCard";
import { upsertBrand } from "@/lib/actions/brand";
import { brandPublicPath, computeBrandMetrics } from "@/lib/brand/metrics";
import { eur } from "@/lib/format";
import {
  brandStatusLabel,
  campaignChannelLabel,
  campaignStatusLabel,
  leadSourceLabel,
  pipelineStageLabel,
  sitePageStatusLabel,
} from "@/lib/labels";
import {
  EmptyHint,
  PageHeader,
  SectionCard,
  SoftDetails,
  btnDark,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function BrandDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      campaigns: { orderBy: { updatedAt: "desc" }, take: 5 },
      sites: { orderBy: { updatedAt: "desc" }, take: 5 },
    },
  });
  if (!brand) notFound();

  const metrics = await computeBrandMetrics(brand.id, membership.organizationId);
  let social: Record<string, string> = {};
  try {
    social = brand.socialJson ? JSON.parse(brand.socialJson) : {};
  } catch {
    social = {};
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/app/marchi"
        backLabel="Marchi"
        title={brand.name}
        description={brand.tagline || "Numeri, campagne e siti di questo brand."}
        actions={
          <>
            <Link href={`/app/crm?brandId=${brand.id}`} className={btnSecondary}>
              Vedi lead
            </Link>
            <Link href={`/app/marchi/${brand.id}/campagne`} className={btnSecondary}>
              Campagne
            </Link>
            <Link href={`/app/marchi/${brand.id}/siti`} className={btnPrimary}>
              Crea / gestisci siti
            </Link>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: brand.primaryColor }}
        />
        <StatusPill>{brandStatusLabel[brand.status]}</StatusPill>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lead" value={String(metrics.leadsTotal)} hint={`${metrics.leadsOpen} aperti`} />
        <StatCard label="In preventivo" value={eur(metrics.pipelineValue)} hint={`${metrics.quotesTotal} quote`} />
        <StatCard label="Venduto" value={eur(metrics.wonRevenue)} hint={`margine ${metrics.avgMarginPct.toFixed(0)}%`} />
        <StatCard
          label="Conversione"
          value={`${metrics.conversionLeadToQuote.toFixed(0)}%`}
          hint={`lead→quote · won ${metrics.conversionQuoteToWon.toFixed(0)}%`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campagne live" value={String(metrics.campaignsLive)} hint={`speso ${eur(metrics.campaignSpend)}`} />
        <StatCard label="Ricavi ads" value={eur(metrics.campaignAttributedRevenue)} />
        <StatCard label="Siti online" value={String(metrics.sitesPublished)} hint={`${metrics.siteViews} visite`} />
        <StatCard label="Form ricevuti" value={String(metrics.siteFormSubmits)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title="Da dove arrivano i lead">
          {metrics.bySource.length === 0 ? (
            <EmptyHint>Ancora nessun lead su questo brand.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {metrics.bySource.map((row) => (
                <div key={row.source} className="flex justify-between gap-3 text-sm">
                  <span>{leadSourceLabel[row.source as keyof typeof leadSourceLabel] || row.source}</span>
                  <span className="font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="A che punto sono in pipeline">
          {metrics.byStage.length === 0 ? (
            <EmptyHint>Pipeline vuota.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {metrics.byStage.map((row) => (
                <div key={row.stage} className="flex justify-between gap-3 text-sm">
                  <span>{pipelineStageLabel[row.stage as keyof typeof pipelineStageLabel] || row.stage}</span>
                  <span className="font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard
          title="Campagne"
          action={
            <Link href={`/app/marchi/${brand.id}/campagne`} className="text-sm font-semibold text-teal-800 underline">
              Tutte
            </Link>
          }
        >
          {brand.campaigns.length === 0 ? (
            <EmptyHint>
              Nessuna campagna.{" "}
              <Link href={`/app/marchi/${brand.id}/campagne`} className="font-semibold underline">
                Creane una
              </Link>
            </EmptyHint>
          ) : (
            <div className="space-y-2">
              {brand.campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {campaignChannelLabel[c.channel]} · {eur(c.spend)}
                    </div>
                  </div>
                  <StatusPill>{campaignStatusLabel[c.status]}</StatusPill>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Siti & landing"
          action={
            <Link href={`/app/marchi/${brand.id}/siti`} className="text-sm font-semibold text-teal-800 underline">
              Tutti
            </Link>
          }
        >
          {brand.sites.length === 0 ? (
            <EmptyHint>
              Nessun sito.{" "}
              <Link href={`/app/marchi/${brand.id}/siti`} className="font-semibold underline">
                Crea la prima landing
              </Link>
            </EmptyHint>
          ) : (
            <div className="space-y-2">
              {brand.sites.map((s) => (
                <Link
                  key={s.id}
                  href={`/app/marchi/${brand.id}/siti/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 text-sm hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.status === "PUBLISHED" ? brandPublicPath(brand, s.slug) : "bozza"} · {s.views} visite
                    </div>
                  </div>
                  <StatusPill>{sitePageStatusLabel[s.status]}</StatusPill>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SoftDetails summary="Identità brand, SEO e social (opzionale)">
        <form action={upsertBrand} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={brand.id} />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Nome</span>
            <input name="name" defaultValue={brand.name} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Slug URL</span>
            <input name="slug" defaultValue={brand.slug} className={fieldClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Tagline</span>
            <input name="tagline" defaultValue={brand.tagline || ""} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Dominio</span>
            <input name="domain" defaultValue={brand.domain || ""} placeholder="yoyiyo.biz" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Sito esistente</span>
            <input name="websiteUrl" defaultValue={brand.websiteUrl || ""} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">SEO title</span>
            <input name="seoTitle" defaultValue={brand.seoTitle || ""} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Stato</span>
            <select name="status" defaultValue={brand.status} className={fieldClass}>
              <option value="ACTIVE">Attivo</option>
              <option value="DRAFT">Bozza</option>
              <option value="ARCHIVED">Archiviato</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">SEO description</span>
            <textarea name="seoDescription" rows={2} defaultValue={brand.seoDescription || ""} className={fieldClass} />
          </label>
          <input name="instagram" placeholder="@instagram" defaultValue={social.instagram || ""} className={fieldClass} />
          <input name="facebook" placeholder="pagina Facebook" defaultValue={social.facebook || ""} className={fieldClass} />
          <input name="whatsapp" placeholder="WhatsApp business" defaultValue={social.whatsapp || ""} className={`${fieldClass} sm:col-span-2`} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            Primario
            <input name="primaryColor" type="color" defaultValue={brand.primaryColor} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            Secondario
            <input name="secondaryColor" type="color" defaultValue={brand.secondaryColor} />
          </label>
          <button className={`${btnDark} sm:col-span-2 sm:w-fit`}>Salva identità</button>
        </form>
      </SoftDetails>
    </div>
  );
}
