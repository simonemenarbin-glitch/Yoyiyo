"use client";

import { useActionState } from "react";
import { eur } from "@/lib/format";
import {
  runSandboxBook,
  runSandboxCancel,
  runSandboxQuote,
  runSandboxSearch,
  type SandboxActionState,
  type SandboxSearchState,
} from "@/lib/actions/suppliers";
import { btnDark, btnSecondary, fieldClass } from "@/components/ui";

const emptySearch: SandboxSearchState = { offers: [], query: "", connectorCode: "" };
const emptyAction: SandboxActionState = { ok: false, message: "" };

export function SandboxTester({
  connectors,
}: {
  connectors: { code: string; name: string; enabled: boolean }[];
}) {
  const [searchState, searchAction, searchPending] = useActionState(runSandboxSearch, emptySearch);
  const [quoteState, quoteAction, quotePending] = useActionState(runSandboxQuote, emptyAction);
  const [bookState, bookAction, bookPending] = useActionState(runSandboxBook, emptyAction);
  const [cancelState, cancelAction, cancelPending] = useActionState(runSandboxCancel, emptyAction);

  return (
    <div className="space-y-4">
      <form action={searchAction} className="grid gap-2 md:grid-cols-4">
        <input name="query" placeholder="Cerca (Pechino, hotel, panda…)" className={fieldClass} defaultValue="Pechino" />
        <input name="city" placeholder="Città" className={fieldClass} />
        <select name="connectorCode" className={fieldClass} defaultValue="">
          <option value="">Tutti i connettori on</option>
          {connectors.map((c) => (
            <option key={c.code} value={c.code} disabled={!c.enabled}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        <select name="serviceType" className={fieldClass} defaultValue="">
          <option value="">Tutti i tipi</option>
          <option value="HOTEL">Hotel</option>
          <option value="PACKAGE">Pacchetto</option>
          <option value="EXCURSION">Escursione</option>
          <option value="TRANSFER">Transfer</option>
        </select>
        <input name="checkIn" type="date" defaultValue="2026-09-10" className={fieldClass} />
        <input name="checkOut" type="date" defaultValue="2026-09-13" className={fieldClass} />
        <input name="paxCount" type="number" min={1} defaultValue={2} className={fieldClass} />
        <button className={btnDark} disabled={searchPending}>
          {searchPending ? "Cerco…" : "Cerca sandbox"}
        </button>
      </form>

      {searchState.error ? (
        <p className="text-sm text-red-700">{searchState.error}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Offerta</th>
              <th className="px-3 py-2">Fonte</th>
              <th className="px-3 py-2 text-right">Netto</th>
              <th className="px-3 py-2 text-right">Vendita</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {searchState.offers.map((o) => (
              <tr key={o.offerId} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium text-[#0F3D3E]">{o.title}</div>
                  <div className="text-xs text-slate-500">
                    {o.city || "—"} · {o.board || "—"} · {o.supplierRef}
                    {o.availableUnits != null ? ` · avail ${o.availableUnits}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{o.connectorName}</td>
                <td className="px-3 py-2 text-right">{eur(o.netCost)}</td>
                <td className="px-3 py-2 text-right font-medium">{eur(o.sellPrice)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <form action={quoteAction}>
                      <input type="hidden" name="connectorCode" value={o.connectorCode} />
                      <input type="hidden" name="offerId" value={o.offerId} />
                      <button className={btnSecondary + " !min-h-8 !px-2 !py-1 !text-xs"} disabled={quotePending}>
                        Quote
                      </button>
                    </form>
                    <form action={bookAction} className="flex gap-1">
                      <input type="hidden" name="connectorCode" value={o.connectorCode} />
                      <input type="hidden" name="offerId" value={o.offerId} />
                      <input type="hidden" name="paxCount" value="2" />
                      <input
                        name="holderName"
                        defaultValue="Demo Holder"
                        className="min-h-8 w-28 rounded-lg border border-slate-200 px-2 text-xs"
                      />
                      <button className={btnSecondary + " !min-h-8 !px-2 !py-1 !text-xs"} disabled={bookPending}>
                        Book
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!searchState.offers.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  Lancia una ricerca sandbox (Travio pacchetti vs Hotelston hotel).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
          <div className="font-medium text-[#0F3D3E]">Ultima quote / book</div>
          <p className="mt-1 text-slate-700">{quoteState.message || bookState.message || "—"}</p>
          {(quoteState.detailJson || bookState.detailJson) && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white p-2 text-[11px] text-slate-600">
              {bookState.detailJson || quoteState.detailJson}
            </pre>
          )}
        </div>
        <form action={cancelAction} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="mb-2 text-sm font-medium text-[#0F3D3E]">Cancel booking sandbox</div>
          <div className="flex flex-wrap gap-2">
            <select name="connectorCode" className={fieldClass + " !min-h-9 max-w-[10rem]"}>
              <option value="travio">travio</option>
              <option value="hotelston">hotelston</option>
            </select>
            <input
              name="bookingRef"
              placeholder="TV-SBX-… / HS-SBX-…"
              className={fieldClass + " !min-h-9 flex-1"}
              defaultValue={
                bookState.detailJson
                  ? (JSON.parse(bookState.detailJson) as { bookingRef?: string }).bookingRef || ""
                  : ""
              }
            />
            <button className={btnSecondary} disabled={cancelPending}>
              Cancel
            </button>
          </div>
          {cancelState.message ? (
            <p className="mt-2 text-sm text-slate-700">{cancelState.message}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
