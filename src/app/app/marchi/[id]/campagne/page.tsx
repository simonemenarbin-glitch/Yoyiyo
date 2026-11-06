import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { upsertCampaign } from "@/lib/actions/brand";
import { eur } from "@/lib/format";
import {
  campaignChannelLabel,
  campaignChannelsOrdered,
  campaignStatusLabel,
  campaignStatusesOrdered,
} from "@/lib/labels";
import {
  EmptyHint,
  PageHeader,
  SectionCard,
  SoftDetails,
  btnDark,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function BrandCampaignsPage({
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
      campaigns: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { leads: true, sites: true } } },
      },
    },
  });
  if (!brand) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/app/marchi/${brand.id}`}
        backLabel={brand.name}
        title="Campagne"
        description="Traccia ads, newsletter e landing: budget, click e lead che portano."
        actions={
          <Link href={`/app/marchi/${brand.id}/siti`} className={btnSecondary}>
            Vai ai siti
          </Link>
        }
      />

      {brand.campaigns.length === 0 ? (
        <EmptyHint>Nessuna campagna ancora. Compila il form sotto: bastano nome e canale.</EmptyHint>
      ) : (
        <div className="space-y-2 sm:hidden">
          {brand.campaigns.map((c) => (
            <div key={c.id} className="rounded-2xl border border-teal-900/10 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-[#0F3D3E]">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {campaignChannelLabel[c.channel]}
                    {c.utmCampaign ? ` · ${c.utmCampaign}` : ""}
                  </div>
                </div>
                <StatusPill>{campaignStatusLabel[c.status]}</StatusPill>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="font-semibold">{eur(c.spend)}</div>
                  <div className="text-xs text-slate-500">speso</div>
                </div>
                <div>
                  <div className="font-semibold">{c._count.leads || c.leadsCount}</div>
                  <div className="text-xs text-slate-500">lead</div>
                </div>
                <div>
                  <div className="font-semibold">{c._count.sites}</div>
                  <div className="text-xs text-slate-500">siti</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {brand.campaigns.length > 0 ? (
        <div className="hidden overflow-hidden rounded-2xl border border-teal-900/10 bg-white sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Campagna</th>
                <th className="px-4 py-3">Canale</th>
                <th className="px-4 py-3">Budget / speso</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody>
              {brand.campaigns.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0F3D3E]">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.utmCampaign || "—"} · {c._count.sites} siti
                    </div>
                  </td>
                  <td className="px-4 py-3">{campaignChannelLabel[c.channel]}</td>
                  <td className="px-4 py-3">
                    {eur(c.budget)} / {eur(c.spend)}
                  </td>
                  <td className="px-4 py-3">{c._count.leads || c.leadsCount}</td>
                  <td className="px-4 py-3">
                    <StatusPill>{campaignStatusLabel[c.status]}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <SectionCard title="Nuova campagna" hint="Compila i campi essenziali. Il resto è opzionale.">
        <form action={upsertCampaign} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="brandId" value={brand.id} />
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Nome</span>
            <input
              name="name"
              required
              placeholder="es. Meta Ads Cina primavera"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Canale</span>
            <select name="channel" defaultValue="LANDING" className={fieldClass}>
              {campaignChannelsOrdered.map((ch) => (
                <option key={ch} value={ch}>
                  {campaignChannelLabel[ch]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Stato</span>
            <select name="status" defaultValue="DRAFT" className={fieldClass}>
              {campaignStatusesOrdered.map((st) => (
                <option key={st} value={st}>
                  {campaignStatusLabel[st]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Obiettivo</span>
            <input
              name="goal"
              placeholder="es. Lead B2C per preventivi FIT"
              className={fieldClass}
            />
          </label>

          <div className="sm:col-span-2">
            <SoftDetails summary="Dettagli opzionali (UTM, budget, date)">
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="utmCampaign" placeholder="Nome tracciamento (utm)" className={fieldClass} />
                <input name="utmSource" placeholder="Fonte (es. meta)" className={fieldClass} />
                <input name="utmMedium" placeholder="Mezzo (es. cpc)" className={fieldClass} />
                <input name="budget" type="number" step="0.01" placeholder="Budget €" className={fieldClass} />
                <input name="spend" type="number" step="0.01" placeholder="Già speso €" className={fieldClass} />
                <input name="impressions" type="number" placeholder="Impression" className={fieldClass} />
                <input name="clicks" type="number" placeholder="Click" className={fieldClass} />
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Inizio</span>
                  <input name="startAt" type="date" className={fieldClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Fine</span>
                  <input name="endAt" type="date" className={fieldClass} />
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Note"
                  className={`${fieldClass} sm:col-span-2`}
                />
              </div>
            </SoftDetails>
          </div>

          <button className={`${btnDark} sm:col-span-2 sm:w-fit`}>Crea campagna</button>
        </form>
      </SectionCard>

      {brand.campaigns.length > 0 ? (
        <SoftDetails summary="Aggiorna una campagna esistente (stato, spend, UTM)">
          <form action={upsertCampaign} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="brandId" value={brand.id} />
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Quale campagna</span>
              <select name="id" required className={fieldClass}>
                {brand.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <input name="name" placeholder="Lascia vuoto per tenere il nome attuale" className={`${fieldClass} sm:col-span-2`} />
            <select name="channel" defaultValue="LANDING" className={fieldClass}>
              {campaignChannelsOrdered.map((ch) => (
                <option key={ch} value={ch}>
                  {campaignChannelLabel[ch]}
                </option>
              ))}
            </select>
            <select name="status" defaultValue="LIVE" className={fieldClass}>
              {campaignStatusesOrdered.map((st) => (
                <option key={st} value={st}>
                  {campaignStatusLabel[st]}
                </option>
              ))}
            </select>
            <input name="budget" type="number" step="0.01" placeholder="Budget" className={fieldClass} />
            <input name="spend" type="number" step="0.01" placeholder="Spend" className={fieldClass} />
            <input name="impressions" type="number" placeholder="Impression" className={fieldClass} />
            <input name="clicks" type="number" placeholder="Click" className={fieldClass} />
            <button className={`${btnSecondary} sm:col-span-2 sm:w-fit`}>Salva aggiornamento</button>
          </form>
        </SoftDetails>
      ) : null}
    </div>
  );
}
