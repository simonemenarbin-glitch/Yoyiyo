import { eur, shortDate } from "@/lib/format";
import { productTypeLabel } from "@/lib/labels";
import type { Practice, PracticeLine, Brand, Customer, AgencyPartner } from "@prisma/client";

type PracticeFull = Practice & {
  brand: Brand | null;
  customer: Customer | null;
  partner: AgencyPartner | null;
  lines: PracticeLine[];
};

const BORDEAUX = "#B33A2B";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseShell(title: string, body: string) {
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
  .foot { margin-top: 28px; font-size: 9pt; color: #555; }
  .band { background: ${BORDEAUX}; color: #fff; padding: 10px 14px; border-radius: 8px; margin: 14px 0; }
  @media print { button { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>
${body}
<p class="foot">Documento generato da Rotta ERP · non sostituisce i documenti ufficiali di viaggio se non validato dall’Ufficio Booking.</p>
<script>/* print helper */</script>
</body>
</html>`;
}

export function buildVoucherHtml(practice: PracticeFull) {
  const guest = practice.customer
    ? `${practice.customer.firstName} ${practice.customer.lastName}`
    : practice.partner?.name || "Cliente";
  const brand = practice.brand?.name || "Yoyiyo";
  const rows = practice.lines
    .map(
      (l) => `<tr>
      <td>${esc(l.title)}</td>
      <td>${esc(productTypeLabel[l.serviceType] || l.serviceType)}</td>
      <td>${l.quantity}</td>
      <td>${esc(shortDate(l.startDate))} – ${esc(shortDate(l.endDate))}</td>
    </tr>`,
    )
    .join("");

  const body = `
  <h1>VOUCHER / CONFERMA SERVIZI</h1>
  <div class="sub">${esc(brand)} · Ufficio Booking</div>
  <div class="meta">
    <div><strong>Pratica</strong> ${esc(practice.reference)} — ${esc(practice.title)}</div>
    <div><strong>Intestatario</strong> ${esc(guest)}</div>
    <div><strong>Periodo</strong> ${esc(shortDate(practice.departureDate))} → ${esc(shortDate(practice.returnDate))} · ${practice.paxCount} pax</div>
    <div><strong>Stato</strong> ${esc(practice.status)}</div>
  </div>
  <div class="band">Presentare questo voucher ai fornitori locali / guide insieme al documento d’identità. WeChat obbligatorio entro 48 ore dalla partenza per assistenza 24h.</div>
  <h2>SERVIZI INCLUSI</h2>
  <table>
    <thead><tr><th>Servizio</th><th>Tipo</th><th>Qty</th><th>Date</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4">Nessun servizio in pratica</td></tr>`}</tbody>
  </table>
  <h2>NOTE OPERATIVE</h2>
  <ul>
    <li>Documenti di viaggio trasmessi non prima di 10 giorni dalla partenza.</li>
    <li>Giornata intera guida / accompagnatore / autista: fino a 8 ore; straordinari in loco.</li>
    <li>«Guida» solo a Pechino e Xi’an; altrove accompagnatore parlante italiano.</li>
    <li>Assistenza Yoyiyo sugli imprevisti operativi, non conciergerie privata.</li>
  </ul>
  ${practice.notes ? `<h2>NOTE PRATICA</h2><p>${esc(practice.notes)}</p>` : ""}
  `;

  return {
    title: `Voucher ${practice.reference}`,
    bodyHtml: baseShell(`Voucher ${practice.reference}`, body),
  };
}

export function buildFoglioNotizieHtml(practice: PracticeFull) {
  const brand = practice.brand?.name || "Yoyiyo";
  const guest = practice.customer
    ? `${practice.customer.firstName} ${practice.customer.lastName}`
    : practice.partner?.name || "Cliente";

  const dayBlocks = practice.lines
    .map((l) => {
      const when = l.startDate || practice.departureDate;
      return `<h2>${esc(shortDate(when))} — ${esc(l.title)}</h2>
      <ul>
        <li>Tipo: ${esc(productTypeLabel[l.serviceType] || l.serviceType)} · qty ${l.quantity}</li>
        ${l.notes ? `<li>${esc(l.notes)}</li>` : `<li>Dettaglio operativo da confermare in booking.</li>`}
      </ul>`;
    })
    .join("\n");

  const body = `
  <h1>PROGRAMMA DI VIAGGIO CINA — ${esc(practice.reference)}</h1>
  <div class="sub">${esc(brand)} Tour Operator · foglio notizie operativo</div>
  <div class="meta">
    <div><strong>Viaggio</strong> ${esc(practice.title)}</div>
    <div><strong>Cliente / agenzia</strong> ${esc(guest)}</div>
    <div><strong>Date</strong> ${esc(shortDate(practice.departureDate))} → ${esc(shortDate(practice.returnDate))} · ${practice.paxCount} pax</div>
    <div><strong>Totale vendita</strong> ${esc(eur(practice.totalSell))} (uso interno booking — non scorporare in mail cliente se B2C Yoyiyo)</div>
  </div>
  <h2>VOLI</h2>
  <ul>
    <li>Da compilare in conferma (compagnia / PNR). Non quotare Pechino↔Shanghai o Chengdu↔Zhangjiajie in volo: solo treno AV.</li>
  </ul>
  <h2>TRENI</h2>
  <ul>
    <li>Tratte AV previste dal programma pratica; transfer stazione↔hotel da verificare.</li>
  </ul>
  <h2>HOTEL</h2>
  <ul>
    ${
      practice.lines
        .filter((l) => l.serviceType === "HOTEL")
        .map((l) => `<li>${esc(l.title)} · ${esc(shortDate(l.startDate))} – ${esc(shortDate(l.endDate))}</li>`)
        .join("") || "<li>Hotel da elenco servizi pratica / conferma disponibilità.</li>"
    }
  </ul>
  <h2>PROGRAMMA GIORNO PER GIORNO</h2>
  ${dayBlocks || "<p>Nessuna riga servizio — completare la pratica prima di emettere il foglio.</p>"}
  <h2>COSA È INCLUSO</h2>
  <ul>
    <li>Servizi elencati in pratica allo stato ${esc(practice.status)}.</li>
    <li>Penali e acconti secondo policy groupage &gt;20 / FIT della conferma.</li>
  </ul>
  <h2>NOTE OPERATIVE</h2>
  <ul>
    <li>WeChat entro 48h dalla partenza.</li>
    <li>Gestione: Ufficio Booking italiano + backoffice Cina.</li>
    <li>Documenti di viaggio non prima di 10 giorni dalla partenza.</li>
  </ul>
  `;

  return {
    title: `Foglio notizie ${practice.reference}`,
    bodyHtml: baseShell(`Foglio notizie ${practice.reference}`, body),
  };
}

export function buildConfermaHtml(practice: PracticeFull, penaltyNote?: string) {
  const brand = practice.brand?.name || "Yoyiyo";
  const guest = practice.customer
    ? `${practice.customer.firstName} ${practice.customer.lastName}`
    : practice.partner?.name || "Cliente";

  const body = `
  <h1>CONFERMA PRATICA</h1>
  <div class="sub">${esc(brand)} · Ufficio Booking</div>
  <div class="meta">
    <div><strong>Riferimento</strong> ${esc(practice.reference)}</div>
    <div><strong>Titolo</strong> ${esc(practice.title)}</div>
    <div><strong>Destinatario</strong> ${esc(guest)}</div>
    <div><strong>Confermata il</strong> ${esc(shortDate(practice.confirmedAt))}</div>
    <div><strong>Partenza</strong> ${esc(shortDate(practice.departureDate))} · ${practice.paxCount} pax</div>
    <div><strong>Groupage &gt;20</strong> ${practice.groupageOver20 ? "Sì — acconto 10%, release 120 gg" : "No — penali FIT da conferma"}</div>
    ${
      practice.groupageOver20
        ? `<div><strong>Acconto</strong> ${practice.depositPct}% · ${esc(eur(practice.depositAmount))}</div>`
        : ""
    }
  </div>
  <h2>CONDIZIONI IN CASO DI CANCELLAZIONE</h2>
  <ul>
    ${
      practice.groupageOver20
        ? `<li>Acconto 10% rimborsabile fino al release voli (${practice.releaseDays} giorni dalla partenza).</li>
           <li>Dopo il release, sulla quota annullata: 15% / 30% / 50% / 75% / 100% secondo la scala giorni.</li>`
        : `<li>Dalla conferma, sulla quota annullata: 15% (&gt;30 gg) · 30% (29–21) · 50% (20–11) · 75% (10–3) · 100% (da 2 gg / no-show).</li>`
    }
    <li>Assicurazioni emesse e costi fornitori non recuperabili restano esclusi dal rimborso.</li>
  </ul>
  ${penaltyNote ? `<p class="meta">${esc(penaltyNote)}</p>` : ""}
  <h2>SERVIZI</h2>
  <table>
    <thead><tr><th>Servizio</th><th>Qty</th><th>Vendita riga</th></tr></thead>
    <tbody>
      ${practice.lines
        .map(
          (l) =>
            `<tr><td>${esc(l.title)}</td><td>${l.quantity}</td><td>${esc(eur(l.sellPrice * l.quantity))}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  `;

  return {
    title: `Conferma ${practice.reference}`,
    bodyHtml: baseShell(`Conferma ${practice.reference}`, body),
  };
}
