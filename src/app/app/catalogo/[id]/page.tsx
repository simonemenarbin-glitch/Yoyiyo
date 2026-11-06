import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { PageHeader, SectionCard, btnDark, btnPrimary, fieldClass } from "@/components/ui";
import { eur, shortDate } from "@/lib/format";
import {
  allotmentUnitLabel,
  policyKindLabel,
  productTypeLabel,
  supplementKindLabel,
} from "@/lib/labels";
import {
  addAllotmentBucket,
  addContractPeriod,
  addContractPolicy,
  addRateSupplement,
  bookAllotmentDemo,
} from "@/lib/actions/catalog";
import { allotmentAvailability, resolveTariff, sumSupplements } from "@/lib/catalog/pricing";

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const product = await prisma.catalogProduct.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      ratePlans: { orderBy: { createdAt: "asc" } },
      periods: { orderBy: { validFrom: "asc" } },
      supplements: { orderBy: { createdAt: "asc" } },
      allotments: { orderBy: { createdAt: "asc" } },
      policies: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) notFound();

  const demoCheckIn = new Date("2026-07-15");
  const tariff = resolveTariff({
    ratePlans: product.ratePlans,
    periods: product.periods,
    checkIn: demoCheckIn,
    bookAsOf: new Date("2026-04-01"),
  });
  const supp = sumSupplements(product.supplements, {
    checkIn: demoCheckIn,
    periodId: tariff.periodId || null,
    baseSell: tariff.sellPrice,
    nights: 3,
    pax: 2,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contratto"
        title={product.name}
        description={`${productTypeLabel[product.type]} · ${product.city || "—"} · ${product.code || "senza codice"}`}
        backHref="/app/catalogo"
        backLabel="Listino"
        actions={
          <Link href="/app/preventivi/nuovo" className={btnPrimary}>
            Usa in preventivo
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Tariffa demo 15/07/2026</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(tariff.sellPrice)}</div>
          <div className="text-sm text-slate-600">
            Netto {eur(tariff.netCost)} · {tariff.source === "PERIOD" ? "periodo" : "rate plan"} «
            {tariff.label}»
          </div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Supplementi (3 notti / 2 pax)</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(supp.total)}</div>
          <div className="text-sm text-slate-600">{supp.lines.length} voci applicabili</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Allotment</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{product.allotments.length}</div>
          <div className="text-sm text-slate-600">bucket contratti</div>
        </div>
      </div>

      <SectionCard title="Periodi / stagioni" hint="Tariffe per finestra date + prenotabile entro">
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Dal</th>
                <th className="py-2 pr-3">Al</th>
                <th className="py-2 pr-3">Min stay</th>
                <th className="py-2 pr-3">Pren. entro</th>
                <th className="py-2 pr-3 text-right">Netto</th>
                <th className="py-2 text-right">Vendita</th>
              </tr>
            </thead>
            <tbody>
              {product.periods.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{shortDate(p.validFrom)}</td>
                  <td className="py-2 pr-3">{shortDate(p.validTo)}</td>
                  <td className="py-2 pr-3">{p.minStay}</td>
                  <td className="py-2 pr-3">{p.bookableUntil ? shortDate(p.bookableUntil) : "—"}</td>
                  <td className="py-2 pr-3 text-right">{eur(p.netCost)}</td>
                  <td className="py-2 text-right font-medium">{eur(p.sellPrice)}</td>
                </tr>
              ))}
              {!product.periods.length ? (
                <tr>
                  <td colSpan={7} className="py-3 text-slate-500">
                    Nessun periodo — vale la tariffa base del rate plan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form action={addContractPeriod} className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="Nome periodo" className={fieldClass} required />
          <input name="validFrom" type="date" className={fieldClass} required />
          <input name="validTo" type="date" className={fieldClass} required />
          <input name="bookableUntil" type="date" className={fieldClass} title="Prenotabile entro" />
          <input name="netCost" type="number" step="1" placeholder="Netto" className={fieldClass} />
          <input name="sellPrice" type="number" step="1" placeholder="Vendita" className={fieldClass} />
          <input name="minStay" type="number" min={1} defaultValue={1} placeholder="Min stay" className={fieldClass} />
          <button className={btnDark}>Aggiungi periodo</button>
        </form>
      </SectionCard>

      <SectionCard title="Allotment" hint="Quote contratto, release e free-sale">
        <div className="mb-4 space-y-3">
          {product.allotments.map((a) => {
            const avail = allotmentAvailability(a, { checkIn: demoCheckIn });
            return (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-[#0F3D3E]">{a.name}</div>
                  <div className="text-sm text-slate-600">
                    {allotmentUnitLabel[a.unit]} · tot {a.totalUnits} · booked {a.bookedUnits} ·
                    released {a.releasedUnits} · release {a.releaseDays} gg
                    {a.freeSale ? " · free-sale" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill>
                    {avail.status} · {avail.available}
                  </StatusPill>
                  <form action={bookAllotmentDemo}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="allotmentId" value={a.id} />
                    <input type="hidden" name="qty" value="1" />
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                      Prenota 1 (demo)
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {!product.allotments.length ? (
            <p className="text-sm text-slate-500">Nessun allotment — disponibilità su richiesta.</p>
          ) : null}
        </div>
        <form action={addAllotmentBucket} className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="Nome allotment" className={fieldClass} required />
          <select name="unit" className={fieldClass} defaultValue="ROOM">
            {Object.entries(allotmentUnitLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input name="totalUnits" type="number" min={0} placeholder="Totale unità" className={fieldClass} />
          <input name="releaseDays" type="number" min={0} defaultValue={21} placeholder="Release gg" className={fieldClass} />
          <select name="periodId" className={fieldClass} defaultValue="">
            <option value="">Tutti i periodi</option>
            {product.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="freeSale" value="1" /> Free-sale
          </label>
          <button className={btnDark}>Aggiungi allotment</button>
        </form>
      </SectionCard>

      <SectionCard title="Supplementi" hint="Single, bambino, pensione, city tax…">
        <ul className="mb-4 space-y-2 text-sm">
          {product.supplements.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2">
              <span>
                <span className="font-medium text-[#0F3D3E]">{s.name}</span>
                <span className="ml-2 text-slate-500">{supplementKindLabel[s.kind]}</span>
              </span>
              <span className="font-medium">
                {s.isPercent ? `${s.amount}%` : eur(s.amount)}
                {s.perNight ? " / notte" : ""}
                {s.perPerson ? " / pax" : ""}
              </span>
            </li>
          ))}
          {!product.supplements.length ? (
            <li className="text-slate-500">Nessun supplemento.</li>
          ) : null}
        </ul>
        <form action={addRateSupplement} className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="Nome" className={fieldClass} required />
          <select name="kind" className={fieldClass} defaultValue="SINGLE">
            {Object.entries(supplementKindLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input name="amount" type="number" step="0.01" placeholder="Importo / %" className={fieldClass} />
          <select name="periodId" className={fieldClass} defaultValue="">
            <option value="">Tutti i periodi</option>
            {product.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPercent" value="1" /> Percentuale
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="perNight" value="1" defaultChecked /> Per notte
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="perPerson" value="1" /> Per persona
          </label>
          <button className={btnDark}>Aggiungi supplemento</button>
        </form>
      </SectionCard>

      <SectionCard title="Politiche" hint="Cancellazione, pagamento, release">
        <ul className="mb-4 space-y-3">
          {product.policies.map((pol) => (
            <li key={pol.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#0F3D3E]">{pol.name}</span>
                <StatusPill>{policyKindLabel[pol.kind]}</StatusPill>
              </div>
              <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{pol.bodyText}</p>
              <div className="mt-1 text-xs text-slate-400">
                {pol.daysBefore != null ? `${pol.daysBefore} gg prima · ` : ""}
                {pol.penaltyPct != null ? `penale ${pol.penaltyPct}% · ` : ""}
                {pol.depositPct != null ? `acconto ${pol.depositPct}%` : ""}
              </div>
            </li>
          ))}
          {!product.policies.length ? (
            <li className="text-sm text-slate-500">Nessuna policy sul prodotto.</li>
          ) : null}
        </ul>
        <form action={addContractPolicy} className="grid gap-2 md:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="Nome policy" className={fieldClass} required />
          <select name="kind" className={fieldClass} defaultValue="CANCELLATION">
            {Object.entries(policyKindLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <textarea
            name="bodyText"
            rows={3}
            placeholder="Testo policy"
            className={`${fieldClass} md:col-span-2`}
            required
          />
          <input name="daysBefore" type="number" placeholder="Giorni prima" className={fieldClass} />
          <input name="penaltyPct" type="number" step="1" placeholder="Penale %" className={fieldClass} />
          <input name="depositPct" type="number" step="1" placeholder="Acconto %" className={fieldClass} />
          <button className={btnDark}>Aggiungi policy</button>
        </form>
      </SectionCard>

      <SectionCard title="Rate plan base">
        <ul className="space-y-2 text-sm">
          {product.ratePlans.map((r) => (
            <li key={r.id} className="flex justify-between border-b border-slate-100 py-2">
              <span>
                {r.name}
                {r.cancellationPolicy ? (
                  <span className="ml-2 text-slate-500">{r.cancellationPolicy}</span>
                ) : null}
              </span>
              <span>
                {eur(r.netCost)} → <strong>{eur(r.sellPrice)}</strong>
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
