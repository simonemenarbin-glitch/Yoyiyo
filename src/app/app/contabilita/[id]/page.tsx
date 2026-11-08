import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { markInvoicePaid, updateInvoiceStatus } from "@/lib/actions/invoices";
import {
  buildInvoiceHtml,
  invoiceDirectionLabel,
  invoiceRegimeLabel,
  invoiceStatusLabel,
  type InvoiceLineInput,
} from "@/lib/accounting/invoices";
import { eur, shortDate } from "@/lib/format";
import {
  FlashOk,
  PageHeader,
  SectionCard,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;
  const sp = await searchParams;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      practice: true,
      quote: true,
      customer: true,
      partner: true,
    },
  });
  if (!invoice) notFound();

  let lines: InvoiceLineInput[] = [];
  try {
    lines = invoice.linesJson ? (JSON.parse(invoice.linesJson) as InvoiceLineInput[]) : [];
  } catch {
    lines = [];
  }

  const html = buildInvoiceHtml({
    number: invoice.number,
    direction: invoice.direction,
    regime: invoice.regime,
    counterpartyName: invoice.counterpartyName,
    counterpartyVat: invoice.counterpartyVat,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    vatRate: invoice.vatRate,
    vatAmount: invoice.vatAmount,
    total: invoice.total,
    marginBase: invoice.marginBase,
    lines,
    practiceRef: invoice.practice?.reference,
    quoteRef: invoice.quote?.number,
    notes: invoice.notes,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/app/contabilita"
        backLabel="Contabilità"
        title={invoice.number}
        description={`${invoiceDirectionLabel[invoice.direction]} · ${invoice.counterpartyName}`}
        actions={
          invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
            <form action={markInvoicePaid}>
              <input type="hidden" name="id" value={invoice.id} />
              <button className={btnPrimary}>Segna pagata</button>
            </form>
          ) : null
        }
      />

      {sp.paid ? <FlashOk>Pagamento registrato.</FlashOk> : null}

      <div className="flex flex-wrap gap-2">
        <StatusPill>{invoiceStatusLabel[invoice.status]}</StatusPill>
        <StatusPill>{invoiceRegimeLabel[invoice.regime]}</StatusPill>
        <span className="text-sm text-slate-600">{eur(invoice.total)}</span>
        <span className="text-sm text-slate-500">
          pagato {eur(invoice.paidAmount)} · scad. {invoice.dueDate ? shortDate(invoice.dueDate) : "—"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <SectionCard title="Anteprima (stampa PDF)">
          <iframe title="Fattura" srcDoc={html} className="h-[65vh] w-full rounded-xl border border-slate-200" />
        </SectionCard>
        <aside className="space-y-4">
          <SectionCard title="Collegamenti">
            {invoice.practice ? (
              <Link
                href={`/app/pratiche/${invoice.practice.id}`}
                className="block text-sm font-semibold text-[#B33A2B]"
              >
                Pratica {invoice.practice.reference} →
              </Link>
            ) : (
              <p className="text-sm text-slate-500">Nessuna pratica</p>
            )}
            {invoice.quote ? (
              <Link
                href={`/app/preventivi/${invoice.quote.id}`}
                className="mt-2 block text-sm font-semibold text-[#B33A2B]"
              >
                Preventivo {invoice.quote.number} →
              </Link>
            ) : null}
            {invoice.customer ? (
              <p className="mt-2 text-sm text-slate-600">
                Cliente {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
            ) : null}
          </SectionCard>
          <SectionCard title="Aggiorna stato">
            <form action={updateInvoiceStatus} className="space-y-2">
              <input type="hidden" name="id" value={invoice.id} />
              <select name="status" defaultValue={invoice.status} className={fieldClass}>
                {Object.entries(invoiceStatusLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Importo pagato</span>
                <input
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  defaultValue={invoice.paidAmount}
                  className={fieldClass}
                />
              </label>
              <button className={btnSecondary}>Salva</button>
            </form>
          </SectionCard>
          <SectionCard title="Totali">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotale</dt>
                <dd>{eur(invoice.subtotal)}</dd>
              </div>
              {invoice.regime === "MARGIN_74TER" ? (
                <div className="flex justify-between">
                  <dt>Base margine</dt>
                  <dd>{eur(invoice.marginBase)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>IVA {invoice.vatRate}%</dt>
                <dd>{eur(invoice.vatAmount)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Totale</dt>
                <dd>{eur(invoice.total)}</dd>
              </div>
            </dl>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
