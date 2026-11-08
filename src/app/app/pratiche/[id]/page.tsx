import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur, marginLabel, shortDate } from "@/lib/format";
import { channelLabel, practiceStatusLabel, productTypeLabel } from "@/lib/labels";
import {
  cancelPracticeServices,
  generatePracticeDocument,
  registerPracticeVariation,
  updatePracticeOps,
} from "@/lib/actions/practices-ops";
import { createPracticeContract } from "@/lib/actions/contracts";
import { computeCancellationPenalty, suggestedDeposit } from "@/lib/practices/penalties";
import { contractStatusLabel } from "@/lib/practices/contract";

export const dynamic = "force-dynamic";

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const practice = await prisma.practice.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      quotes: true,
      changes: { orderBy: { createdAt: "desc" }, take: 30 },
      documents: { orderBy: { generatedAt: "desc" }, take: 20 },
      contracts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!practice) notFound();

  const groupage = practice.groupageOver20 || practice.paxCount > 20;
  const deposit = suggestedDeposit(practice.totalSell, groupage);
  const preview = computeCancellationPenalty({
    departureDate: practice.departureDate,
    groupageOver20: groupage,
    releaseDays: practice.releaseDays || 120,
    confirmedAt: practice.confirmedAt,
    cancelledSell: practice.totalSell,
    depositAmount: practice.depositAmount || deposit.amount,
  });

  const activeLines = practice.lines.filter((l) => l.status !== "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/pratiche" className="text-sm text-teal-800/70">
            ← Pratiche
          </Link>
          <h1
            className="mt-2 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {practice.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <StatusPill>{practiceStatusLabel[practice.status]}</StatusPill>
            <span>{practice.reference}</span>
            <span>·</span>
            <span>{channelLabel[practice.channel]}</span>
            <span>·</span>
            <span>{practice.brand?.name || "Senza brand"}</span>
            {groupage ? <StatusPill>Groupage &gt;20</StatusPill> : <StatusPill>FIT / ≤20</StatusPill>}
          </div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 px-5 py-4 text-right">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Vendita</div>
          <div className="text-2xl font-semibold text-[#0F3D3E]">{eur(practice.totalSell)}</div>
          <div className="text-sm text-slate-500">
            costo {eur(practice.totalCost)} · margine{" "}
            {marginLabel(practice.totalSell, practice.totalCost)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Cliente</div>
          <div className="mt-1 font-medium">
            {practice.customer
              ? `${practice.customer.firstName} ${practice.customer.lastName}`
              : "—"}
          </div>
          <div className="text-sm text-slate-500">{practice.customer?.email || ""}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Partner B2B</div>
          <div className="mt-1 font-medium">{practice.partner?.name || "—"}</div>
          <div className="text-sm text-slate-500">{practice.partner?.email || ""}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Date</div>
          <div className="mt-1 font-medium">
            {shortDate(practice.departureDate)} → {shortDate(practice.returnDate)}
          </div>
          <div className="text-sm text-slate-500">
            {practice.paxCount} pax
            {practice.confirmedAt ? ` · conf. ${shortDate(practice.confirmedAt)}` : ""}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-amber-900/60">Penali ad oggi</div>
          <div className="mt-1 text-sm text-amber-950">
            {preview.daysToDeparture != null ? `${preview.daysToDeparture} gg alla partenza` : "Date mancanti"}
            {groupage ? ` · release ${practice.releaseDays || 120} gg` : ""}
          </div>
          <div className="mt-1 font-semibold text-amber-950">
            Penale stimata {eur(preview.penaltyAmount)}
            {groupage && preview.beforeRelease ? " (acconto rimborsabile)" : ""}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Stato operativo e policy</h2>
        <form action={updatePracticeOps} className="mt-3 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="practiceId" value={practice.id} />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Stato pratica</span>
            <select
              name="status"
              defaultValue={practice.status}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              {Object.entries(practiceStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Pax</span>
            <input
              name="paxCount"
              type="number"
              min={1}
              defaultValue={practice.paxCount}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="flex items-end gap-2 text-sm md:pb-2">
            <input
              type="checkbox"
              name="groupageOver20"
              value="1"
              defaultChecked={groupage}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>Groupage oltre 20 pax (acconto 10% / release 120 gg)</span>
          </label>
          <div className="flex items-end">
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Salva stato
            </button>
          </div>
          <label className="block text-sm md:col-span-4">
            <span className="mb-1 block text-slate-600">Note pratica</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={practice.notes || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          {groupage
            ? `Acconto suggerito ${deposit.pct}% = ${eur(deposit.amount)}. Rimborsabile fino a ${practice.releaseDays || 120} giorni dalla partenza; poi scala 15/30/50/75/100.`
            : "FIT / piccoli gruppi: penali standard dalla conferma (15/30/50/75/100). Nessun acconto 10% a 120 giorni."}
        </p>
        <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
          Anteprima cancellazione totale oggi: {preview.explanation}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F3D3E]">
          Servizi in pratica
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Servizio</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Stato</th>
              <th className="px-4 py-2 font-medium text-right">Costo</th>
              <th className="px-4 py-2 font-medium text-right">Vendita</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {practice.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{line.title}</div>
                  <div className="text-slate-500">{line.product?.code || line.notes || ""}</div>
                </td>
                <td className="px-4 py-3">{productTypeLabel[line.serviceType]}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3">
                  <StatusPill>{line.status}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right">{eur(line.netCost)}</td>
                <td className="px-4 py-3 text-right font-medium">{eur(line.sellPrice)}</td>
                <td className="px-4 py-3 text-right">
                  {line.status !== "CANCELLED" ? (
                    <form action={cancelPracticeServices}>
                      <input type="hidden" name="practiceId" value={practice.id} />
                      <input type="hidden" name="mode" value="PARTIAL" />
                      <input type="hidden" name="lineId" value={line.id} />
                      <button className="text-xs text-red-700 hover:underline">Annulla riga</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Registra variazione</h2>
          <p className="mt-1 text-xs text-slate-500">
            Variazioni puntuali (date, hotel, pax). Delta vendita/costo aggiornano i totali pratica.
          </p>
          <form action={registerPracticeVariation} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="practiceId" value={practice.id} />
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-600">Titolo</span>
              <input
                name="title"
                required
                placeholder="es. Cambio hotel Shanghai"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-600">Dettaglio</span>
              <textarea
                name="detail"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Δ vendita €</span>
              <input
                name="sellDelta"
                type="number"
                step="1"
                defaultValue={0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Δ costo €</span>
              <input
                name="costDelta"
                type="number"
                step="1"
                defaultValue={0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Pax interessati</span>
              <input
                name="paxAffected"
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <div className="flex items-end">
              <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
                Salva variazione
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Cancellazione</h2>
          <p className="mt-1 text-xs text-slate-500">
            Calcola penali Yoyiyo (groupage &gt;20 vs FIT) e registra lo storico. Annulla riga dalla
            tabella servizi, oppure tutta la pratica qui.
          </p>
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Servizi attivi: {activeLines.length}/{practice.lines.length} · penale totale stimata{" "}
            <strong>{eur(preview.penaltyAmount)}</strong>
          </div>
          <form action={cancelPracticeServices} className="mt-4">
            <input type="hidden" name="practiceId" value={practice.id} />
            <input type="hidden" name="mode" value="FULL" />
            <button
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800"
              disabled={practice.status === "CANCELLED"}
            >
              Annulla pratica intera (con penale)
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#0F3D3E]">Contratto + firma</h2>
            <p className="mt-1 text-xs text-slate-500">
              Conferma pratica → contratto HTML (stampa PDF/Word) → e-sign sandbox.
            </p>
          </div>
          <form action={createPracticeContract} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="practiceId" value={practice.id} />
            <input type="hidden" name="confirmPractice" value="1" />
            <button className="rounded-xl bg-[#B33A2B] px-4 py-2.5 text-sm font-semibold text-white">
              Genera contratto
            </button>
          </form>
        </div>
        <div className="mt-4 space-y-2">
          {practice.contracts.map((c) => (
            <Link
              key={c.id}
              href={`/app/pratiche/${practice.id}/contratti/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-teal-50/40"
            >
              <span className="font-medium text-[#0F3D3E]">{c.title}</span>
              <span className="text-slate-500">
                {contractStatusLabel[c.status]} · {shortDate(c.updatedAt)}
              </span>
            </Link>
          ))}
          {practice.contracts.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun contratto ancora.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#0F3D3E]">Documenti operativi</h2>
            <p className="mt-1 text-xs text-slate-500">
              Voucher, conferma e foglio notizie (schema titoli bordeaux). Stampabili dal browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["VOUCHER", "Voucher"],
                ["CONFERMA", "Conferma"],
                ["FOGLIO_NOTIZIE", "Foglio notizie"],
              ] as const
            ).map(([type, label]) => (
              <form key={type} action={generatePracticeDocument}>
                <input type="hidden" name="practiceId" value={practice.id} />
                <input type="hidden" name="type" value={type} />
                <button className="rounded-xl border border-[#0F3D3E]/20 bg-white px-3 py-2 text-sm font-medium text-[#0F3D3E]">
                  Genera {label}
                </button>
              </form>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {practice.documents.map((d) => (
            <Link
              key={d.id}
              href={`/app/pratiche/${practice.id}/documenti/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-teal-50/40"
            >
              <span className="font-medium text-[#0F3D3E]">{d.title}</span>
              <span className="text-slate-500">{shortDate(d.generatedAt)}</span>
            </Link>
          ))}
          {practice.documents.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun documento generato.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Storico variazioni / cancellazioni</h2>
        <div className="mt-3 space-y-2">
          {practice.changes.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-[#0F3D3E]">
                  {c.title}{" "}
                  <span className="text-xs font-normal text-slate-500">{c.kind}</span>
                </div>
                <div className="text-xs text-slate-500">{shortDate(c.effectiveAt)}</div>
              </div>
              {c.detail ? <p className="mt-1 text-slate-600">{c.detail}</p> : null}
              <div className="mt-1 text-xs text-slate-500">
                Δ vendita {eur(c.sellDelta)}
                {c.penaltyAmount != null ? ` · penale ${eur(c.penaltyAmount)} (${c.penaltyPct ?? 0}%)` : ""}
                {c.daysToDeparture != null ? ` · ${c.daysToDeparture} gg partenza` : ""}
              </div>
            </div>
          ))}
          {practice.changes.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna variazione registrata.</p>
          ) : null}
        </div>
      </section>

      {practice.quotes.length > 0 ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="mb-3 font-semibold text-[#0F3D3E]">Preventivi collegati</div>
          <div className="space-y-2">
            {practice.quotes.map((q) => (
              <Link
                key={q.id}
                href={`/app/preventivi/${q.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:bg-teal-50/40"
              >
                <span>
                  {q.number} — {q.title}
                </span>
                <span className="font-medium">{eur(q.totalSell)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
