import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  buildAiAudienceList,
  rebuildAudienceList,
  refreshSeoSnapshots,
  upsertAdsCampaign,
} from "@/lib/actions/growth";
import { AUDIENCE_PROMPT_EXAMPLES } from "@/lib/growth/ai-lists";
import { runSeoChecklist } from "@/lib/growth/seo-checklist";
import { brandPublicPath } from "@/lib/brand/metrics";
import {
  campaignChannelLabel,
  campaignStatusLabel,
  leadSourceLabel,
  pipelineStageLabel,
} from "@/lib/labels";
import {
  EmptyHint,
  FlashOk,
  PageHeader,
  SectionCard,
  btnDark,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function GrowthHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;

  const [brands, campaigns, sites, lists, leadCount] = await Promise.all([
    prisma.brand.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      include: { brand: true, audienceLists: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.brandSite.findMany({
      where: { organizationId: orgId },
      include: { brand: true, campaign: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.audienceList.findMany({
      where: { organizationId: orgId },
      include: { brand: true, campaign: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.lead.count({ where: { organizationId: orgId } }),
  ]);

  const adsCampaigns = campaigns.filter((c) => c.channel === "ADS" || c.channel === "SEO");
  const focusList = sp.list ? lists.find((l) => l.id === sp.list) : null;
  let focusMembers: {
    leadId: string;
    name: string;
    email?: string | null;
    source: string;
    stage: string;
  }[] = [];
  if (focusList?.membersJson) {
    try {
      focusMembers = JSON.parse(focusList.membersJson);
    } catch {
      focusMembers = [];
    }
  }

  const seoRows = sites.map((site) => {
    const result = runSeoChecklist({
      brand: site.brand,
      site,
      campaignUtm: site.campaign?.utmCampaign,
    });
    return { site, ...result };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Growth hub"
        description={`Ads stub · SEO landing · liste AI sul CRM (${leadCount} lead). Offline, senza token Meta Ads.`}
        actions={
          <>
            <Link href="/app/social" className={btnSecondary}>
              Social
            </Link>
            <Link href="/app/landing" className={btnSecondary}>
              Landing
            </Link>
          </>
        }
      />

      {sp.saved ? <FlashOk>Campagna salvata.</FlashOk> : null}
      {sp.members != null ? (
        <FlashOk>
          Lista costruita: {sp.members} contatti
          {focusList ? ` · «${focusList.name}»` : ""}.
        </FlashOk>
      ) : null}
      {sp.seo != null ? <FlashOk>Snapshot SEO aggiornati su {sp.seo} campagne collegate.</FlashOk> : null}
      {sp.err ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">{sp.err}</div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        <a href="#ads" className="rounded-full bg-[#0F3D3E]/10 px-3 py-1 font-medium text-[#0F3D3E]">
          Ads
        </a>
        <a href="#seo" className="rounded-full bg-[#0F3D3E]/10 px-3 py-1 font-medium text-[#0F3D3E]">
          SEO
        </a>
        <a href="#liste" className="rounded-full bg-[#0F3D3E]/10 px-3 py-1 font-medium text-[#0F3D3E]">
          Liste AI
        </a>
      </div>

      <SectionCard
        id="ads"
        title="Campagne ads (stub)"
        hint="Traccia budget/spend/UTM e collega liste audience. Nessuna chiamata live ad account."
      >
        <form action={upsertAdsCampaign} className="grid gap-3 sm:grid-cols-2">
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
            <span className="mb-1.5 block font-medium text-slate-700">Nome campagna</span>
            <input name="name" required placeholder="Meta leads ottobre" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Canale</span>
            <select name="channel" defaultValue="ADS" className={fieldClass}>
              <option value="ADS">Ads</option>
              <option value="SEO">SEO</option>
              <option value="SOCIAL">Social</option>
              <option value="LANDING">Landing</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Piattaforma ads</span>
            <select name="adPlatform" defaultValue="meta" className={fieldClass}>
              <option value="meta">Meta (FB/IG)</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="google">Google</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Budget totale €</span>
            <input name="budget" type="number" step="1" defaultValue={500} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Daily budget €</span>
            <input name="dailyBudget" type="number" step="1" defaultValue={25} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">utm_campaign</span>
            <input name="utmCampaign" placeholder="cina-classic-meta" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Lista audience</span>
            <select name="audienceListId" className={fieldClass} defaultValue="">
              <option value="">— nessuna —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.memberCount})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Obiettivo</span>
            <input name="goal" placeholder="Lead FIT da landing" className={fieldClass} />
          </label>
          <input type="hidden" name="utmSource" value="ads" />
          <input type="hidden" name="utmMedium" value="cpc" />
          <input type="hidden" name="status" value="DRAFT" />
          <input type="hidden" name="objective" value="leads" />
          <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>Crea campagna stub</button>
        </form>

        <div className="mt-4 space-y-2">
          {adsCampaigns.length === 0 ? (
            <EmptyHint>Nessuna campagna ADS/SEO ancora.</EmptyHint>
          ) : (
            adsCampaigns.map((c) => {
              let platform = "—";
              try {
                platform = c.extrasJson ? JSON.parse(c.extrasJson).platform || "—" : "—";
              } catch {
                /* */
              }
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-900/10 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-[#0F3D3E]">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.brand.name} · {campaignChannelLabel[c.channel]} · {platform} · budget €
                      {c.budget} · spend €{c.spend}
                    </div>
                  </div>
                  <StatusPill>{campaignStatusLabel[c.status]}</StatusPill>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard
        id="seo"
        title="SEO checklist landing / siti"
        hint="Score offline su title, slug, hero, form, UTM, publish — pensato per TO multi-brand."
      >
        <form action={refreshSeoSnapshots} className="mb-3">
          <input type="hidden" name="back" value="/app/growth" />
          <button className={btnSecondary}>Salva snapshot SEO sulle campagne collegate</button>
        </form>
        {seoRows.length === 0 ? (
          <EmptyHint>
            Nessun sito. Crea una landing in{" "}
            <Link href="/app/landing" className="underline">
              Landing
            </Link>
            .
          </EmptyHint>
        ) : (
          <div className="space-y-3">
            {seoRows.map(({ site, score, checks }) => (
              <div key={site.id} className="rounded-2xl border border-teal-900/10 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {site.brand.name}
                    </div>
                    <div className="font-semibold text-[#0F3D3E]">{site.name}</div>
                    <div className="text-sm text-slate-500">
                      {site.status === "PUBLISHED"
                        ? brandPublicPath(site.brand, site.slug)
                        : "bozza"}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      score >= 80
                        ? "bg-emerald-50 text-emerald-800"
                        : score >= 50
                          ? "bg-amber-50 text-amber-900"
                          : "bg-red-50 text-red-800"
                    }`}
                  >
                    SEO {score}%
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {checks.map((c) => (
                    <li key={c.id} className="flex gap-2 text-sm">
                      <span aria-hidden>{c.ok ? "✓" : "○"}</span>
                      <span className={c.ok ? "text-slate-700" : "text-slate-500"}>
                        {c.label}
                        {!c.ok ? ` — ${c.hint}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/app/marchi/${site.brandId}/siti/${site.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-[#B33A2B]"
                >
                  Apri editor →
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        id="liste"
        title="Liste AI / audience CRM"
        hint="Prompt in italiano → filtri su lead (fonte, stage, groupage, destinazione). Nessuna sync ads live."
      >
        <form action={buildAiAudienceList} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Prompt</span>
            <textarea
              name="prompt"
              rows={2}
              required
              placeholder={AUDIENCE_PROMPT_EXAMPLES[0]}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Nome lista</span>
            <input name="name" placeholder="Audience Meta ottobre" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Brand (opz.)</span>
            <select name="brandId" defaultValue="" className={fieldClass}>
              <option value="">Tutti</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Collega campagna (opz.)</span>
            <select name="campaignId" defaultValue="" className={fieldClass}>
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>Genera lista AI</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Esempi: {AUDIENCE_PROMPT_EXAMPLES.join(" · ")}
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {lists.length === 0 ? (
              <EmptyHint>Nessuna lista. Generane una dal prompt.</EmptyHint>
            ) : (
              lists.map((l) => (
                <div
                  key={l.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    focusList?.id === l.id
                      ? "border-[#B33A2B]/40 bg-[#B33A2B]/5"
                      : "border-teal-900/10 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#0F3D3E]">{l.name}</div>
                      <div className="text-xs text-slate-500">
                        {l.kind} · {l.memberCount} membri
                        {l.brand ? ` · ${l.brand.name}` : ""}
                      </div>
                    </div>
                    <form action={rebuildAudienceList}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className={btnDark}>Rebuild</button>
                    </form>
                  </div>
                  <Link
                    href={`/app/growth?list=${l.id}#liste`}
                    className="mt-1 inline-block text-xs font-semibold text-[#B33A2B]"
                  >
                    Anteprima membri
                  </Link>
                </div>
              ))
            )}
          </div>
          <div className="rounded-2xl border border-teal-900/10 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Membri {focusList ? `· ${focusList.name}` : ""}
            </div>
            {!focusList ? (
              <p className="mt-2 text-sm text-slate-500">Seleziona una lista.</p>
            ) : focusMembers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nessun membro (allarga il prompt).</p>
            ) : (
              <ul className="mt-2 max-h-80 space-y-1 overflow-auto text-sm">
                {focusMembers.slice(0, 40).map((m) => (
                  <li key={m.leadId} className="flex justify-between gap-2 border-b border-white/60 py-1">
                    <Link href={`/app/crm/leads/${m.leadId}`} className="font-medium text-[#0F3D3E]">
                      {m.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {leadSourceLabel[m.source as keyof typeof leadSourceLabel] || m.source} ·{" "}
                      {pipelineStageLabel[m.stage as keyof typeof pipelineStageLabel] || m.stage}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
