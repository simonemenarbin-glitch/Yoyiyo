import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  applyTemplateToBrandSite,
  cloneBrandSite,
  publishBrandSite,
  unpublishBrandSite,
  updateBrandSite,
} from "@/lib/actions/brand";
import {
  brandPublicPath,
  parseSiteBlocks,
  siteBlocksToSimpleFields,
} from "@/lib/brand/metrics";
import { LANDING_TEMPLATES } from "@/lib/brand/templates";
import {
  sitePageStatusLabel,
  sitePageTypeLabel,
  sitePageTypesOrdered,
} from "@/lib/labels";
import { PublicSiteRenderer } from "@/components/brand/PublicSiteRenderer";
import {
  FlashOk,
  PageHeader,
  SectionCard,
  SoftDetails,
  btnDark,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function BrandSiteEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; siteId: string }>;
  searchParams: Promise<{ saved?: string; published?: string; err?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id, siteId } = await params;
  const sp = await searchParams;

  const brand = await prisma.brand.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { campaigns: { orderBy: { name: "asc" } } },
  });
  if (!brand) notFound();

  const site = await prisma.brandSite.findFirst({
    where: { id: siteId, brandId: brand.id, organizationId: membership.organizationId },
    include: { campaign: true },
  });
  if (!site) notFound();

  const simple = siteBlocksToSimpleFields(site.blocksJson, brand.name);
  const blocks = parseSiteBlocks(site.blocksJson, brand.name);
  let prettyJson = site.blocksJson || "";
  try {
    prettyJson = JSON.stringify(JSON.parse(site.blocksJson || "[]"), null, 2);
  } catch {
    /* keep */
  }

  const publicUrl = brandPublicPath(brand, site.slug);

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/app/marchi/${brand.id}/siti`}
        backLabel="Siti"
        title={site.name}
        description={`${site.views} visite · ${site.formSubmits} form${
          site.campaign ? ` · campagna «${site.campaign.name}»` : ""
        }`}
        actions={
          <>
            {site.status === "PUBLISHED" ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className={btnSecondary}>
                Apri live
              </a>
            ) : null}
            <form action={cloneBrandSite}>
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="id" value={site.id} />
              <button className={btnSecondary}>Duplica</button>
            </form>
            {site.status === "PUBLISHED" ? (
              <form action={unpublishBrandSite}>
                <input type="hidden" name="brandId" value={brand.id} />
                <input type="hidden" name="id" value={site.id} />
                <button className={btnSecondary}>Metti in bozza</button>
              </form>
            ) : null}
            <form action={publishBrandSite}>
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="id" value={site.id} />
              <button className={btnPrimary}>
                {site.status === "PUBLISHED" ? "Ripubblica" : "Pubblica ora"}
              </button>
            </form>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill>{sitePageStatusLabel[site.status]}</StatusPill>
        <span className="text-sm text-slate-500">{publicUrl}</span>
        <Link href="/app/landing" className="text-sm font-medium text-[#B33A2B]">
          Hub landing →
        </Link>
      </div>

      {sp.saved ? <FlashOk>Modifiche salvate.</FlashOk> : null}
      {sp.published ? (
        <FlashOk>
          Pubblicata.{" "}
          <a href={publicUrl} className="font-semibold underline" target="_blank" rel="noreferrer">
            Apri {publicUrl}
          </a>
        </FlashOk>
      ) : null}
      {sp.err === "template" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Template non trovato.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <form action={updateBrandSite} className="space-y-4">
            <input type="hidden" name="brandId" value={brand.id} />
            <input type="hidden" name="id" value={site.id} />
            <input type="hidden" name="editorMode" value="simple" />

            <SectionCard title="1. Impostazioni pagina" hint="Nome, indirizzo e testo del pulsante.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Nome interno</span>
                  <input name="name" defaultValue={site.name} className={fieldClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Indirizzo (slug)</span>
                  <input name="slug" defaultValue={site.slug} className={fieldClass} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Titolo SEO / scheda</span>
                  <input name="title" defaultValue={site.title} className={fieldClass} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Sottotitolo breve</span>
                  <input name="subtitle" defaultValue={site.subtitle || ""} className={fieldClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Testo pulsante</span>
                  <input
                    name="ctaLabel"
                    defaultValue={site.ctaLabel || "Richiedi preventivo"}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Stato</span>
                  <select name="status" defaultValue={site.status} className={fieldClass}>
                    <option value="DRAFT">{sitePageStatusLabel.DRAFT}</option>
                    <option value="PUBLISHED">{sitePageStatusLabel.PUBLISHED}</option>
                    <option value="ARCHIVED">{sitePageStatusLabel.ARCHIVED}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Tipo</span>
                  <select name="pageType" defaultValue={site.pageType} className={fieldClass}>
                    {sitePageTypesOrdered.map((t) => (
                      <option key={t} value={t}>
                        {sitePageTypeLabel[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Campagna</span>
                  <select name="campaignId" defaultValue={site.campaignId || ""} className={fieldClass}>
                    <option value="">— nessuna —</option>
                    {brand.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="ctaHref" value={site.ctaHref || ""} />
              </div>
            </SectionCard>

            <SectionCard title="2. Testo in evidenza (hero)" hint="La prima cosa che vede il visitatore.">
              <div className="grid gap-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Titolo grande</span>
                  <input name="heroTitle" defaultValue={simple.heroTitle} className={fieldClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Sottotitolo</span>
                  <textarea
                    name="heroSubtitle"
                    rows={2}
                    defaultValue={simple.heroSubtitle}
                    className={fieldClass}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="3. Perché sceglierci" hint="Fino a 3 punti. Lascia vuoto se non serve.">
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                    <input
                      name={`feature${n}Title`}
                      placeholder={`Punto ${n} — titolo`}
                      defaultValue={simple[`feature${n}Title` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                    <input
                      name={`feature${n}Text`}
                      placeholder={`Punto ${n} — testo breve`}
                      defaultValue={simple[`feature${n}Text` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="4. Idea di itinerario" hint="Fino a 3 tappe. Solo titoli e una riga.">
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                    <input
                      name={`day${n}Title`}
                      placeholder={`Tappa ${n} — es. Pechino`}
                      defaultValue={simple[`day${n}Title` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                    <input
                      name={`day${n}Text`}
                      placeholder={`Cosa si fa`}
                      defaultValue={simple[`day${n}Text` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="5. Gallery / testo / CTA" hint="Opzionali. Caption gallery una per riga.">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Caption gallery</span>
                <textarea
                  name="galleryCaptions"
                  rows={3}
                  defaultValue={simple.galleryCaptions}
                  placeholder={"Muraglia · Pechino\nTerracotta · Xi’an"}
                  className={fieldClass}
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Titolo testo</span>
                  <input name="textTitle" defaultValue={simple.textTitle} className={fieldClass} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Corpo testo</span>
                  <textarea
                    name="textBody"
                    rows={3}
                    defaultValue={simple.textBody}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">CTA titolo</span>
                  <input name="ctaTitle" defaultValue={simple.ctaTitle} className={fieldClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">CTA sottotitolo</span>
                  <input
                    name="ctaSubtitle"
                    defaultValue={simple.ctaSubtitle}
                    className={fieldClass}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="6. Form e FAQ" hint="Il form crea automaticamente un lead sul brand.">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Titolo del form</span>
                <input name="formTitle" defaultValue={simple.formTitle} className={fieldClass} />
              </label>
              <label className="mt-3 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Frasi di fiducia (una per riga)
                </span>
                <textarea
                  name="trustItems"
                  rows={3}
                  defaultValue={simple.trustItems}
                  placeholder={"Validità preventivo 7 giorni\nIpotesi senza budget"}
                  className={fieldClass}
                />
              </label>
              <div className="mt-3 space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="grid gap-2 rounded-xl bg-slate-50 p-3">
                    <input
                      name={`faq${n}Q`}
                      placeholder={`FAQ ${n} — domanda`}
                      defaultValue={simple[`faq${n}Q` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                    <textarea
                      name={`faq${n}A`}
                      rows={2}
                      placeholder={`FAQ ${n} — risposta`}
                      defaultValue={simple[`faq${n}A` as keyof typeof simple] as string}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="sticky bottom-20 z-20 rounded-2xl border border-teal-900/10 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">Salva i testi, poi pubblica quando sei pronto.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className={btnDark}>
                    Salva modifiche
                  </button>
                  <Link href={publicUrl} target="_blank" className={btnSecondary}>
                    Anteprima URL
                  </Link>
                </div>
              </div>
            </div>
          </form>

          <SectionCard title="Applica template" hint="Sovrascrive i blocchi e rimette la pagina in bozza.">
            <form action={applyTemplateToBrandSite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="id" value={site.id} />
              <label className="block flex-1 text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Template</span>
                <select name="templateId" className={fieldClass} defaultValue="fit-cina">
                  {LANDING_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className={btnSecondary}>Applica</button>
            </form>
          </SectionCard>

          <SoftDetails summary="Avanzato: modifica JSON blocchi (solo se sai cosa fai)">
            <form action={updateBrandSite} className="space-y-3">
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="id" value={site.id} />
              <input type="hidden" name="editorMode" value="json" />
              <input type="hidden" name="name" value={site.name} />
              <input type="hidden" name="slug" value={site.slug} />
              <input type="hidden" name="title" value={site.title} />
              <input type="hidden" name="subtitle" value={site.subtitle || ""} />
              <input type="hidden" name="ctaLabel" value={site.ctaLabel || ""} />
              <input type="hidden" name="ctaHref" value={site.ctaHref || ""} />
              <input type="hidden" name="campaignId" value={site.campaignId || ""} />
              <input type="hidden" name="pageType" value={site.pageType} />
              <input type="hidden" name="status" value={site.status} />
              <textarea
                name="blocksJson"
                rows={14}
                defaultValue={prettyJson}
                className={`${fieldClass} font-mono text-xs`}
              />
              <button className={btnSecondary}>Salva JSON</button>
            </form>
          </SoftDetails>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Anteprima live
            </h2>
            <span className="text-xs text-slate-400">{blocks.length} blocchi</span>
          </div>
          <div className="max-h-[80vh] overflow-auto rounded-2xl border border-teal-900/15 bg-white shadow-inner">
            <div className="origin-top scale-[0.72] sm:scale-[0.78] xl:scale-[0.85]">
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
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
