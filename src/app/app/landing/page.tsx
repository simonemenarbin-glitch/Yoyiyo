import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { createBrandSite } from "@/lib/actions/brand";
import { brandPublicPath } from "@/lib/brand/metrics";
import { LANDING_TEMPLATES } from "@/lib/brand/templates";
import {
  sitePageStatusLabel,
  sitePageTypeLabel,
} from "@/lib/labels";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function LandingHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const brands = await prisma.brand.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      sites: {
        orderBy: { updatedAt: "desc" },
        include: { campaign: true },
      },
      campaigns: { orderBy: { name: "asc" } },
    },
  });

  const allSites = brands.flatMap((b) =>
    b.sites.map((s) => ({ brand: b, site: s })),
  );
  const published = allSites.filter((x) => x.site.status === "PUBLISHED").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Landing builder"
        description={`Pubblica landing per brand · ${published} live · ${allSites.length} totali. Stile LeadConnector, pensato per TO italiani.`}
        actions={
          <Link href="/app/marchi" className={btnSecondary}>
            Marchi
          </Link>
        }
      />

      <SectionCard
        title="Crea da template"
        hint="Scegli brand + template: crea, modifica e pubblica senza chiavi Meta."
      >
        {brands.length === 0 ? (
          <EmptyState
            title="Nessun marchio"
            action={
              <Link href="/app/marchi" className={btnPrimary}>
                Vai a Marchi
              </Link>
            }
          >
            Crea un marchio prima di pubblicare una landing.
          </EmptyState>
        ) : (
          <form action={createBrandSite} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Brand</span>
              <select name="brandId" required className={fieldClass} defaultValue={brands[0]?.id}>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Template</span>
              <select name="templateId" required className={fieldClass} defaultValue="fit-cina">
                {LANDING_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Nome interno</span>
              <input name="name" placeholder="es. Ads Meta ottobre" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Slug (opzionale)</span>
              <input name="slug" placeholder="auto dal template" className={fieldClass} />
            </label>
            <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>
              Crea landing e apri editor
            </button>
          </form>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-teal-900/10 bg-slate-50/80 px-3 py-3 text-sm"
            >
              <div className="font-semibold text-[#0F3D3E]">{t.name}</div>
              <p className="mt-1 text-xs text-slate-600">{t.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {allSites.length === 0 ? (
        <EmptyState title="Nessuna landing ancora">
          Usa un template qui sopra, oppure apri un marchio → Siti.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tutte le pagine
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {allSites.map(({ brand, site }) => {
              const url = brandPublicPath(brand, site.slug);
              return (
                <Link
                  key={site.id}
                  href={`/app/marchi/${brand.id}/siti/${site.id}`}
                  className="rounded-2xl border border-teal-900/10 bg-white/90 p-4 shadow-sm transition hover:border-teal-800/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        {brand.name} · {sitePageTypeLabel[site.pageType]}
                      </div>
                      <h3 className="mt-1 truncate text-lg font-semibold text-[#0F3D3E]">
                        {site.name}
                      </h3>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        {site.status === "PUBLISHED" ? url : "bozza"}
                      </div>
                    </div>
                    <StatusPill>{sitePageStatusLabel[site.status]}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>{site.views} visite</span>
                    <span>{site.formSubmits} form → lead</span>
                    {site.campaign ? <span>{site.campaign.name}</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
