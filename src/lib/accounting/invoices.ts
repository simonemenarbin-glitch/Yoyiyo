import type { InvoiceDirection, InvoiceRegime, InvoiceStatus } from "@prisma/client";

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  netCost?: number;
};

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** IVA su imponibile standard. */
export function calcStandardVat(subtotal: number, vatRate: number) {
  const vatAmount = round2((subtotal * vatRate) / 100);
  return {
    subtotal: round2(subtotal),
    vatRate,
    vatAmount,
    total: round2(subtotal + vatAmount),
  };
}

/**
 * 74-ter semplificato offline: IVA sul margine lordo / (1+rate) * rate
 * (allineato allo stub Medusa/Rotta già documentato).
 */
export function calcSeventyFourTer(input: {
  totalSell: number;
  totalCost: number;
  vatRate?: number;
}) {
  const vatRate = input.vatRate ?? 22;
  const marginBase = round2(Math.max(0, input.totalSell - input.totalCost));
  const vatAmount = round2((marginBase / (1 + vatRate / 100)) * (vatRate / 100));
  return {
    costBase: round2(input.totalCost),
    marginBase,
    vatRate,
    vatAmount,
    subtotal: round2(input.totalSell),
    total: round2(input.totalSell), // corrispettivo lordo cliente
  };
}

export function sumLines(lines: InvoiceLineInput[]) {
  return round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
}

export function sumLineCosts(lines: InvoiceLineInput[]) {
  return round2(lines.reduce((s, l) => s + l.quantity * (l.netCost ?? 0), 0));
}

export function nextInvoiceNumber(
  direction: InvoiceDirection,
  existing: string[],
  year = new Date().getFullYear(),
) {
  const prefix = direction === "AR" ? `FT-${year}-` : `FF-${year}-`;
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(prefix)) continue;
    const num = Number(n.slice(prefix.length));
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function deriveInvoiceStatus(input: {
  status: InvoiceStatus;
  total: number;
  paidAmount: number;
  dueDate?: Date | null;
  now?: Date;
}): InvoiceStatus {
  if (input.status === "CANCELLED" || input.status === "DRAFT") return input.status;
  if (input.paidAmount <= 0) {
    if (input.dueDate && input.dueDate.getTime() < (input.now || new Date()).getTime()) {
      return "OVERDUE";
    }
    return input.status === "SENT" || input.status === "ISSUED" || input.status === "OVERDUE"
      ? input.status === "OVERDUE"
        ? "OVERDUE"
        : input.status
      : input.status;
  }
  if (input.paidAmount + 0.001 >= input.total) return "PAID";
  return "PARTIAL";
}

export const invoiceDirectionLabel: Record<InvoiceDirection, string> = {
  AR: "Cliente (AR)",
  AP: "Fornitore (AP)",
};

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  DRAFT: "Bozza",
  ISSUED: "Emessa",
  SENT: "Inviata",
  PARTIAL: "Parziale",
  PAID: "Pagata",
  OVERDUE: "Scaduta",
  CANCELLED: "Annullata",
};

export const invoiceRegimeLabel: Record<InvoiceRegime, string> = {
  STANDARD: "IVA ordinaria",
  MARGIN_74TER: "74-ter (margine)",
};

export function buildInvoiceHtml(input: {
  number: string;
  direction: InvoiceDirection;
  regime: InvoiceRegime;
  counterpartyName: string;
  counterpartyVat?: string | null;
  issueDate: Date;
  dueDate?: Date | null;
  currency: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  marginBase?: number;
  lines: InvoiceLineInput[];
  practiceRef?: string | null;
  quoteRef?: string | null;
  notes?: string | null;
}) {
  const BORDEAUX = "#B33A2B";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: input.currency }).format(n);
  const d = (x?: Date | null) =>
    x ? x.toLocaleDateString("it-IT") : "—";

  const rows = input.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${esc(fmt(l.unitPrice))}</td><td>${esc(fmt(l.quantity * l.unitPrice))}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"/><title>${esc(input.number)}</title>
<style>
body{font-family:Georgia,serif;color:#222;padding:24px}
h1{color:${BORDEAUX};font-size:18pt;text-align:center}
h2{color:${BORDEAUX};font-size:12pt;border-bottom:1px solid ${BORDEAUX}}
table{width:100%;border-collapse:collapse;font-size:10.5pt}
th{background:${BORDEAUX};color:#fff;padding:8px;text-align:left}
td{padding:8px;border-bottom:1px solid #eee}
.meta{background:#FFF8F6;border:1px solid #f0d8d2;border-radius:8px;padding:12px;margin:12px 0}
</style></head><body>
<h1>${input.direction === "AR" ? "FATTURA CLIENTE" : "FATTURA FORNITORE"} ${esc(input.number)}</h1>
<div class="meta">
<div><strong>Controparte</strong> ${esc(input.counterpartyName)}${input.counterpartyVat ? ` · P.IVA ${esc(input.counterpartyVat)}` : ""}</div>
<div><strong>Data</strong> ${esc(d(input.issueDate))} · <strong>Scadenza</strong> ${esc(d(input.dueDate))}</div>
<div><strong>Regime</strong> ${esc(invoiceRegimeLabel[input.regime])}</div>
${input.practiceRef ? `<div><strong>Pratica</strong> ${esc(input.practiceRef)}</div>` : ""}
${input.quoteRef ? `<div><strong>Preventivo</strong> ${esc(input.quoteRef)}</div>` : ""}
</div>
<h2>RIGHE</h2>
<table><thead><tr><th>Descrizione</th><th>Qty</th><th>Prezzo</th><th>Totale</th></tr></thead>
<tbody>${rows || "<tr><td colspan=4>—</td></tr>"}</tbody></table>
<h2>TOTALI</h2>
<ul>
<li>Imponibile / corrispettivo: ${esc(fmt(input.subtotal))}</li>
${input.regime === "MARGIN_74TER" ? `<li>Base margine 74-ter: ${esc(fmt(input.marginBase || 0))}</li>` : ""}
<li>IVA ${input.vatRate}%: ${esc(fmt(input.vatAmount))}</li>
<li><strong>Totale documento: ${esc(fmt(input.total))}</strong></li>
</ul>
${input.notes ? `<p>${esc(input.notes)}</p>` : ""}
<p style="font-size:9pt;color:#555">Documento Rotta ERP · stub contabile offline (nessuna SdI live).</p>
</body></html>`;
}
