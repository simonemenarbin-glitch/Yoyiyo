import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { createBrandSite } from "@/lib/actions/brand";
import { brandPublicPath } from "@/lib/brand/metrics";
import {
  sitePageStatusLabel,
  sitePageTypeLabel,
  sitePageTypesOrdered,
} from "@/lib/labels";
import {
  EmptyHint,
  PageHeader,
  SectionCard,
  SoftDetails,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function BrandSitesPage({
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
      sites: {
        orderBy: { updatedAt: "desc" },
        include: { campaign: true },
      },
      campaigns: { orderBy: { name: "asc" } },
    },
  });
  if (!brand) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/app/marchi/${brand.id}`}
        backLabel={brand.name}
        title="Siti & landing"
        description="Crea una pagina in pochi campi, pubblicala e i form diventano lead sul brand."
        actions={
          <Link href={`/app/marchi/${brand.id}/campagne`} className={btnSecondary}>
            Campagne
          </Link>
        }
      />

      {brand.sites.length === 0 ? (
        <EmptyHint>
          Nessun sito ancora. Sotto crei la prima landing: titolo + slug bastano per partire.
        </EmptyHint>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {brand.sites.map((s) => (
            <Link
              key={s.id}
              href={`/app/marchi/${brand.id}/siti/${s.id}`}
              className="rounded-2xl border border-teal-900/10 bg-white/90 p-4 shadow-sm transition active:scale-[0.99] hover:border-teal-800/25"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {sitePageTypeLabel[s.pageType]}
                  </div>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[#0F3D3E]">{s.name}</h2>
                  <div className="mt-1 truncate text-sm text-slate-500">
                    {s.status === "PUBLISHED" ? brandPublicPath(brand, s.slug) : "bozza — tocca per modificare"}
                  </div>
                </div>
                <StatusPill>{sitePageStatusLabel[s.status]}</StatusPill>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{s.views} visite</span>
                <span>{s.formSubmits} form</span>
                {s.campaign ? <span>→ {s.campaign.name}</span> : null}
              </div>
              <div className="mt-3 text-sm font-semibold text-[#B33A2B]">Apri editor →</div>
            </Link>
          ))}
        </div>
      )}

      <SectionCard
        title="Nuova landing"
        hint="Dopo la creazione apri l’editor semplice: testi, punti di forza, itinerario e form."
      >
        <form action={createBrandSite} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="brandId" value={brand.id} />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Nome interno</span>
            <input name="name" required placeholder="es. Landing Cina Classic" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Indirizzo pagina</span>
            <input name="slug" placeholder="cina-classic" className={fieldClass} />
            <span className="mt-1 block text-xs text-slate-500">
              Diventa /s/{brand.slug}/…
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Titolo in pagina</span>
            <input
              name="title"
              placeholder="Viaggia in Cina con ipotesi su misura"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Sottotitolo</span>
            <input
              name="subtitle"
              defaultValue={brand.tagline || ""}
              className={fieldClass}
            />
          </label>

          <div className="sm:col-span-2">
            <SoftDetails summary="Opzioni (tipo pagina, campagna, CTA)">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Tipo</span>
                  <select name="pageType" defaultValue="LANDING" className={fieldClass}>
                    {sitePageTypesOrdered.map((t) => (
                      <option key={t} value={t}>
                        {sitePageTypeLabel[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Campagna collegata</span>
                  <select name="campaignId" className={fieldClass}>
                    <option value="">— nessuna —</option>
                    {brand.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Testo pulsante</span>
                  <input name="ctaLabel" defaultValue="Richiedi preventivo" className={fieldClass} />
                </label>
              </div>
            </SoftDetails>
          </div>

          <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>
            Crea e apri editor
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
