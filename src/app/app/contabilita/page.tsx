import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { createInvoice } from "@/lib/actions/invoices";
import {
  invoiceDirectionLabel,
  invoiceRegimeLabel,
  invoiceStatusLabel,
} from "@/lib/accounting/invoices";
import { eur, shortDate } from "@/lib/format";
import {
  EmptyHint,
  FlashOk,
  PageHeader,
  SectionCard,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ContabilitaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;
  const direction = sp.direction === "AP" ? "AP" : sp.direction === "AR" ? "AR" : "";

  const [invoices, practices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        ...(direction ? { direction } : {}),
      },
      include: { practice: true, quote: true },
      orderBy: { issueDate: "desc" },
      take: 100,
    }),
    prisma.practice.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { lastName: "asc" },
      take: 40,
    }),
  ]);

  const arOpen = invoices
    .filter((i) => i.direction === "AR" && !["PAID", "CANCELLED"].includes(i.status))
    .reduce((s, i) => s + (i.total - i.paidAmount), 0);
  const apOpen = invoices
    .filter((i) => i.direction === "AP" && !["PAID", "CANCELLED"].includes(i.status))
    .reduce((s, i) => s + (i.total - i.paidAmount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contabilità AR / AP"
        description="Fatture clienti e fornitori (oltre 74-ter stub). Collegabili a pratiche e preventivi."
        actions={
          <Link href="/app/pratiche" className={btnSecondary}>
            Pratiche
          </Link>
        }
      />

      {sp.created ? <FlashOk>Fattura creata.</FlashOk> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-teal-900/10 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Da incassare (AR)</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(arOpen)}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Da pagare (AP)</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(apOpen)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/contabilita" className={btnSecondary}>
          Tutte
        </Link>
        <Link href="/app/contabilita?direction=AR" className={btnSecondary}>
          Solo AR
        </Link>
        <Link href="/app/contabilita?direction=AP" className={btnSecondary}>
          Solo AP
        </Link>
      </div>

      <SectionCard title="Nuova fattura" hint="Da pratica (consigliato) oppure manuale. Regime STANDARD o 74-ter margine.">
        <form action={createInvoice} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Direzione</span>
            <select name="direction" defaultValue="AR" className={fieldClass}>
              <option value="AR">Cliente (AR)</option>
              <option value="AP">Fornitore (AP)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Regime</span>
            <select name="regime" defaultValue="MARGIN_74TER" className={fieldClass}>
              <option value="MARGIN_74TER">74-ter (margine)</option>
              <option value="STANDARD">IVA ordinaria</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Pratica</span>
            <select name="practiceId" defaultValue="" className={fieldClass}>
              <option value="">— nessuna —</option>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference} — {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Cliente (opz.)</span>
            <select name="customerId" defaultValue="" className={fieldClass}>
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Controparte (se manuale)</span>
            <input name="counterpartyName" placeholder="Ragione sociale" className={fieldClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">
              Descrizione riga (se non da pratica)
            </span>
            <input name="lineDescription" placeholder="Servizi land Cina" className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Prezzo unitario</span>
            <input name="lineUnitPrice" type="number" step="0.01" defaultValue={0} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Costo unitario (74-ter)</span>
            <input name="lineNetCost" type="number" step="0.01" defaultValue={0} className={fieldClass} />
          </label>
          <input type="hidden" name="lineQty" value="1" />
          <input type="hidden" name="status" value="ISSUED" />
          <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>Crea fattura</button>
        </form>
      </SectionCard>

      <SectionCard title="Elenco" hint={`${invoices.length} documenti`}>
        {invoices.length === 0 ? (
          <EmptyHint>Nessuna fattura. Creane una da pratica sopra.</EmptyHint>
        ) : (
          <ul className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/app/contabilita/${inv.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F3D3E]">
                      {inv.number} · {inv.counterpartyName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {invoiceDirectionLabel[inv.direction]} · {invoiceRegimeLabel[inv.regime]} ·{" "}
                      {shortDate(inv.issueDate)}
                      {inv.practice ? ` · ${inv.practice.reference}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill>{invoiceStatusLabel[inv.status]}</StatusPill>
                    <span className="font-medium">{eur(inv.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
