import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  addManualQuoteLine,
  removeQuoteLine,
  updateQuotePipeline,
} from "@/lib/actions/crm";
import {
  addQuoteLineFromCatalogDated,
  addQuoteLineFromSupplierOffer,
  convertQuoteToPractice,
} from "@/lib/actions/quotes-pricing";
import { eur, marginLabel, shortDate } from "@/lib/format";
import {
  channelLabel,
  pipelineStageLabel,
  pipelineStagesOrdered,
  priceSourceLabel,
  productTypeLabel,
  quoteStatusLabel,
} from "@/lib/labels";
import { ensureDefaultConnectors, searchSupplierOffers } from "@/lib/suppliers/registry";
import { pickRateForDate } from "@/lib/suppliers/pricing";
import type { ProductType } from "@prisma/client";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;
  const sp = await searchParams;

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      practice: true,
      lead: true,
      lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!quote) notFound();

  await ensureDefaultConnectors(prisma, membership.organizationId);

  const catalog = await prisma.catalogProduct.findMany({
    where: { organizationId: membership.organizationId, active: true },
    include: { ratePlans: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const connectors = await prisma.supplierConnector.findMany({
    where: { organizationId: membership.organizationId, enabled: true },
    orderBy: { name: "asc" },
  });

  const q = typeof sp.q === "string" ? sp.q : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const connectorCode = typeof sp.connector === "string" ? sp.connector : "";
  const serviceTypeRaw = typeof sp.type === "string" ? sp.type : "";
  const serviceType = (serviceTypeRaw || "") as ProductType | "";
  const didSearch = Boolean(q || city || connectorCode || serviceType);

  const offers = didSearch
    ? await searchSupplierOffers(prisma, {
        organizationId: membership.organizationId,
        query: q,
        city,
        connectorCode: connectorCode || undefined,
        serviceType: serviceType || undefined,
        checkIn: quote.departureDate,
        checkOut: quote.returnDate,
        paxCount: quote.paxCount,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/preventivi" className="text-sm text-teal-800/70">
            ← Preventivi
          </Link>
          <h1
            className="mt-2 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {quote.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
            <StatusPill>{quoteStatusLabel[quote.status]}</StatusPill>
            <StatusPill>{pipelineStageLabel[quote.pipelineStage]}</StatusPill>
            <span>{quote.number}</span>
            <span>· {channelLabel[quote.channel]}</span>
            <span>· {quote.paxCount} pax</span>
            <span>· valido fino al {shortDate(quote.validUntil)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/fornitori"
            className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
          >
            Fornitori
          </Link>
          {quote.practice ? (
            <Link
              href={`/app/pratiche/${quote.practice.id}`}
              className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
            >
              Pratica {quote.practice.reference}
            </Link>
          ) : (
            <form action={convertQuoteToPractice}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white">
                Crea pratica
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Destinatario</div>
          <div className="mt-1 font-medium">
            {quote.partner?.name ||
              (quote.customer
                ? `${quote.customer.firstName} ${quote.customer.lastName}`
                : "—")}
          </div>
          {quote.lead ? (
            <Link
              href={`/app/crm/leads/${quote.lead.id}`}
              className="mt-1 inline-block text-sm text-teal-800 underline"
            >
              Lead: {quote.lead.lastName} {quote.lead.firstName}
            </Link>
          ) : null}
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Vendita</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(quote.totalSell)}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Costo</div>
          <div className="mt-1 text-2xl font-semibold text-slate-700">{eur(quote.totalCost)}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Margine</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">
            {marginLabel(quote.totalSell, quote.totalCost)}
          </div>
        </div>
      </div>

      {quote.hypothesisNote ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {quote.hypothesisNote}
        </div>
      ) : null}
      {quote.notes ? (
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-sm text-slate-700">
          {quote.notes}
        </div>
      ) : null}

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Stato vendita / pipeline</h2>
        <form action={updateQuotePipeline} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="quoteId" value={quote.id} />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Stato documento</span>
            <select
              name="status"
              defaultValue={quote.status}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              {Object.entries(quoteStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Stadio pipeline</span>
            <select
              name="pipelineStage"
              defaultValue={quote.pipelineStage}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              {pipelineStagesOrdered.map((s) => (
                <option key={s} value={s}>
                  {pipelineStageLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Salva stato
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F3D3E]">
          Righe preventivo
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Voce</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Fonte prezzo</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Netto</th>
              <th className="px-4 py-2 font-medium text-right">Vendita</th>
              <th className="px-4 py-2 font-medium text-right">Totale</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {line.title}
                  {line.supplierRef ? (
                    <div className="text-xs font-normal text-slate-500">
                      {line.supplierCode || "REF"} · {line.supplierRef}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{productTypeLabel[line.serviceType]}</td>
                <td className="px-4 py-3">{priceSourceLabel[line.priceSource]}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3 text-right">{eur(line.netCost)}</td>
                <td className="px-4 py-3 text-right">{eur(line.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {eur(line.unitPrice * line.quantity)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={removeQuoteLine}>
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <input type="hidden" name="lineId" value={line.id} />
                    <button className="text-xs text-red-700 hover:underline">Rimuovi</button>
                  </form>
                </td>
              </tr>
            ))}
            {quote.lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Nessuna riga — cerca da listino/API o inserisci una voce manuale.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#0F3D3E]">Cerca listino proprio + API fornitori</h2>
            <p className="mt-1 text-xs text-slate-500">
              Stesso flusso Medusa-style: ricerca multi-fonte, poi aggiungi la riga al preventivo.
              Senza credenziali live i connettori esterni usano sandbox demo.
            </p>
          </div>
        </div>
        <form method="get" className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Testo</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="es. Pechino hotel, panda, treno AV"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Città</span>
            <input
              name="city"
              defaultValue={city}
              placeholder="Chengdu"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Tipo</span>
            <select name="type" defaultValue={serviceType} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">Tutti</option>
              {Object.entries(productTypeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Fonte</span>
            <select
              name="connector"
              defaultValue={connectorCode}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <option value="">Tutte le fonti</option>
              {connectors.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-5">
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Cerca offerte
            </button>
          </div>
        </form>

        {didSearch ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Offerta</th>
                  <th className="px-3 py-2 font-medium">Fonte</th>
                  <th className="px-3 py-2 font-medium text-right">Netto</th>
                  <th className="px-3 py-2 font-medium text-right">Vendita</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.offerId} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">{offer.title}</div>
                      <div className="text-xs text-slate-500">
                        {productTypeLabel[offer.serviceType]}
                        {offer.city ? ` · ${offer.city}` : ""}
                        {offer.supplierRef ? ` · ${offer.supplierRef}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {offer.connectorName}
                      <div className="text-xs text-slate-500">
                        {priceSourceLabel[offer.priceSource]}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{eur(offer.netCost)}</td>
                    <td className="px-3 py-2 text-right font-medium">{eur(offer.sellPrice)}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={addQuoteLineFromSupplierOffer} className="inline-flex items-center gap-2">
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <input type="hidden" name="title" value={offer.title} />
                        <input type="hidden" name="serviceType" value={offer.serviceType} />
                        <input type="hidden" name="netCost" value={String(offer.netCost)} />
                        <input type="hidden" name="unitPrice" value={String(offer.sellPrice)} />
                        <input type="hidden" name="priceSource" value={offer.priceSource} />
                        <input type="hidden" name="supplierCode" value={offer.supplierCode} />
                        <input type="hidden" name="supplierRef" value={offer.supplierRef} />
                        <input type="hidden" name="productId" value={offer.productId || ""} />
                        <input type="hidden" name="notes" value={offer.notes || ""} />
                        <input type="hidden" name="connectorName" value={offer.connectorName} />
                        <input
                          name="quantity"
                          type="number"
                          min={1}
                          defaultValue={1}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        />
                        <button className="rounded-lg bg-[#0F3D3E] px-3 py-1.5 text-xs font-medium text-white">
                          Aggiungi
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Nessuna offerta per questi filtri.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Aggiungi rapido da listino</h2>
          <p className="mt-1 text-xs text-slate-500">
            Usa il rate plan valido sulla data partenza del preventivo
            {quote.departureDate ? ` (${shortDate(quote.departureDate)})` : ""}.
          </p>
          <form action={addQuoteLineFromCatalogDated} className="mt-3 space-y-3">
            <input type="hidden" name="quoteId" value={quote.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Prodotto</span>
              <select
                name="productId"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option value="">Seleziona…</option>
                {catalog.map((p) => {
                  const rate = pickRateForDate(p.ratePlans, quote.departureDate);
                  return (
                    <option key={p.id} value={p.id}>
                      {productTypeLabel[p.type]} · {p.name}
                      {rate ? ` — ${eur(rate.sellPrice)}` : ""}
                      {p.priceSource === "SUPPLIER_API" ? " [API]" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Quantità</span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Aggiungi dal listino
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Voce manuale</h2>
          <p className="mt-1 text-xs text-slate-500">
            Fuori listino / placeholder finché non c’è live quote fornitore.
          </p>
          <form action={addManualQuoteLine} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="quoteId" value={quote.id} />
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-600">Titolo</span>
              <input name="title" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Tipo</span>
              <select name="serviceType" defaultValue="OTHER" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
                {Object.entries(productTypeLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Qty</span>
              <input name="quantity" type="number" min={1} defaultValue={1} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Netto €</span>
              <input name="netCost" type="number" step="0.01" defaultValue={0} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Vendita €</span>
              <input name="unitPrice" type="number" step="0.01" defaultValue={0} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <button className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E] sm:col-span-2 sm:w-fit">
              Aggiungi voce manuale
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
