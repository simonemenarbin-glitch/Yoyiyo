import { eur, shortDate } from "@/lib/format";
import { productTypeLabel } from "@/lib/labels";
import type { AgencyPartner, Brand, Customer, Practice, PracticeLine, Quote } from "@prisma/client";

const BORDEAUX = "#B33A2B";

type PracticeFull = Practice & {
  brand: Brand | null;
  customer: Customer | null;
  partner: AgencyPartner | null;
  lines: PracticeLine[];
  quotes?: Quote[];
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #222; margin: 0; padding: 24px; background: #fff; }
  h1 { color: ${BORDEAUX}; font-size: 20pt; text-align: center; margin: 0 0 6px; }
  .sub { text-align: center; color: #222; font-size: 11pt; margin-bottom: 18px; }
  h2 { color: ${BORDEAUX}; font-size: 12pt; border-bottom: 1px solid ${BORDEAUX}; padding-bottom: 4px; margin: 22px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 8px; }
  th { background: ${BORDEAUX}; color: #fff; text-align: left; padding: 8px 10px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  .meta { background: #FFF8F6; border: 1px solid #f0d8d2; border-radius: 8px; padding: 12px 14px; font-size: 10.5pt; }
  .meta strong { color: ${BORDEAUX}; }
  ul { padding-left: 0; list-style: none; }
  li { margin: 6px 0; }
  li::before { content: "◆ "; color: ${BORDEAUX}; }
  .sign { margin-top: 28px; border: 1px dashed ${BORDEAUX}; border-radius: 12px; padding: 16px; background: #fffaf9; }
  .foot { margin-top: 28px; font-size: 9pt; color: #555; }
  @media print { .no-print { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>
${body}
<p class="foot">Contratto generato da Rotta ERP · firma elettronica in modalità sandbox (nessun provider live).</p>
</body>
</html>`;
}

export function buildContractHtml(
  practice: PracticeFull,
  opts?: { signerName?: string | null; quoteNumber?: string | null },
) {
  const brand = practice.brand?.name || "Yoyiyo";
  const guest = practice.customer
    ? `${practice.customer.firstName} ${practice.customer.lastName}`
    : practice.partner?.name || opts?.signerName || "Cliente";
  const quoteRef = opts?.quoteNumber || practice.quotes?.[0]?.number || "—";

  const rows = practice.lines
    .map(
      (l) => `<tr>
      <td>${esc(l.title)}</td>
      <td>${esc(productTypeLabel[l.serviceType] || l.serviceType)}</td>
      <td>${l.quantity}</td>
      <td>${esc(eur(l.sellPrice * l.quantity))}</td>
    </tr>`,
    )
    .join("");

  const body = `
  <h1>CONTRATTO DI VIAGGIO / PRESTAZIONE TURISTICA</h1>
  <div class="sub">${esc(brand)} Tour Operator · conferma pratica ${esc(practice.reference)}</div>
  <div class="meta">
    <div><strong>Pratica</strong> ${esc(practice.reference)} — ${esc(practice.title)}</div>
    <div><strong>Contraente</strong> ${esc(guest)}</div>
    <div><strong>Preventivo collegato</strong> ${esc(quoteRef)}</div>
    <div><strong>Periodo</strong> ${esc(shortDate(practice.departureDate))} → ${esc(shortDate(practice.returnDate))} · ${practice.paxCount} pax</div>
    <div><strong>Corrispettivo</strong> ${esc(eur(practice.totalSell))} ${esc(practice.currency)}</div>
    <div><strong>Groupage &gt;20</strong> ${practice.groupageOver20 || practice.paxCount > 20 ? "Sì" : "No"}</div>
  </div>

  <h2>OGGETTO</h2>
  <ul>
    <li>Il Tour Operator organizza i servizi elencati nella pratica, secondo disponibilità fornitori e penali di conferma.</li>
    <li>Il presente documento integra la conferma pratica e il preventivo accettato.</li>
  </ul>

  <h2>SERVIZI INCLUSI</h2>
  <table>
    <thead><tr><th>Servizio</th><th>Tipo</th><th>Qty</th><th>Importo</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4">Nessun servizio</td></tr>`}</tbody>
  </table>

  <h2>PAGAMENTI E PENALI</h2>
  <ul>
    ${
      practice.groupageOver20 || practice.paxCount > 20
        ? `<li>Acconto 10% (€ ${esc(String(practice.depositAmount || 0))}) rimborsabile fino al release voli (${practice.releaseDays} gg).</li>
           <li>Dopo il release: scala 15 / 30 / 50 / 75 / 100% sulla quota annullata.</li>`
        : `<li>Penali FIT dalla conferma: 15% (&gt;30 gg) · 30% (29–21) · 50% (20–11) · 75% (10–3) · 100% (da 2 gg / no-show).</li>`
    }
    <li>Assicurazioni emesse e costi non recuperabili restano a carico del contraente.</li>
  </ul>

  <h2>FIRMA</h2>
  <div class="sign">
    <p>Il contraente dichiara di aver letto condizioni e penali e di accettare il contratto in firma elettronica sandbox.</p>
    <p><strong>Firmatario</strong>: ${esc(guest)}</p>
    <p><strong>Data</strong>: __________________ &nbsp;&nbsp; <strong>Firma</strong>: __________________</p>
  </div>
  `;

  return {
    title: `Contratto ${practice.reference}`,
    bodyHtml: shell(`Contratto ${practice.reference}`, body),
  };
}

export function newSignToken() {
  return `sgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const contractStatusLabel: Record<
  "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED" | "EXPIRED" | "CANCELLED",
  string
> = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  VIEWED: "Visualizzato",
  SIGNED: "Firmato",
  DECLINED: "Rifiutato",
  EXPIRED: "Scaduto",
  CANCELLED: "Annullato",
};
