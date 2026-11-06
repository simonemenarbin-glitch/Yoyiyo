import type { ParsedLeadFields } from "./types";

const CITY_ALIASES: { canonical: string; patterns: RegExp }[] = [
  { canonical: "Pechino", patterns: /\b(pechino|beijing|pek)\b/i },
  { canonical: "Shanghai", patterns: /\b(shanghai|shanghai)\b/i },
  { canonical: "Xi'an", patterns: /\b(xi['’]?an|xian)\b/i },
  { canonical: "Chengdu", patterns: /\b(chengdu|panda)\b/i },
  { canonical: "Chongqing", patterns: /\b(chongqing)\b/i },
  { canonical: "Zhangjiajie", patterns: /\b(zhangjiajie|avatar)\b/i },
  { canonical: "Guilin", patterns: /\b(guilin)\b/i },
  { canonical: "Yangshuo", patterns: /\b(yangshuo)\b/i },
  { canonical: "Fenghuang", patterns: /\b(fenghuang)\b/i },
];

function pickDestinations(text: string) {
  const found: string[] = [];
  for (const city of CITY_ALIASES) {
    if (city.patterns.test(text) && !found.includes(city.canonical)) {
      found.push(city.canonical);
    }
  }
  if (found.length === 0 && /\bcina\b/i.test(text)) {
    found.push("Cina");
  }
  return found;
}

function pickEmail(text: string) {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0] ?? null;
}

function pickPhone(text: string) {
  const m = text.match(/(?:\+?\d{1,3}[\s./-]?)?(?:\(?\d{2,4}\)?[\s./-]?)?\d{3,4}[\s./-]?\d{3,4}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  if (digits.length < 8) return null;
  return m[0].trim();
}

function pickPax(text: string) {
  const patterns = [
    /(\d{1,2})\s*(?:pax|persone|adulti|viaggiatori|partecipanti)/i,
    /(?:siamo|siamo in|per)\s+(\d{1,2})\s*(?:persone|pax|adulti)?/i,
    /(?:coppia|due persone)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    if (/coppia|due persone/i.test(m[0])) return 2;
    const n = Number(m[1]);
    if (n >= 1 && n <= 80) return n;
  }
  return null;
}

function pickBudget(text: string) {
  const m = text.match(
    /(?:budget|fascia|massimo|max|fino a)\s*(?:di\s*)?(?:€|eur|euro)?\s*([\d.]+)\s*(?:€|eur|euro)?/i,
  );
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pickDuration(text: string) {
  const m = text.match(/(\d{1,2})\s*(?:giorni|gg|notti)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 2 && n <= 40 ? n : null;
}

function pickDeparture(text: string) {
  const m =
    text.match(
      /(?:partenza|parto|dal|tra il|nel|a)\s*((?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)[^\n,]{0,24}|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/i,
    ) || text.match(/\b((?:primavera|estate|autunno|inverno)\s*20\d{2})\b/i);
  return m?.[1]?.trim() || null;
}

function pickNames(text: string) {
  const from = text.match(/^(?:from|da|mittente)\s*:\s*(.+)$/im);
  const signed = text.match(/(?:saluti|cordiali saluti|ciao|sono)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)?)/);
  const raw = (from?.[1] || signed?.[1] || "").replace(/<.*?>/g, "").trim();
  if (!raw) return { firstName: null, lastName: null };
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "Lead" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function pickTripType(text: string, pax: number | null): ParsedLeadFields["tripType"] {
  if (/\b(groupage|gruppo|scuola|comitive)\b/i.test(text) || (pax != null && pax > 8)) {
    return "GROUP";
  }
  if (/\b(fit|individuale|coppia|famiglia)\b/i.test(text) || (pax != null && pax <= 8)) {
    return "FIT";
  }
  return "UNKNOWN";
}

export function parseLeadSource(raw: string): ParsedLeadFields {
  const text = raw.replace(/\r/g, "").trim();
  const destinations = pickDestinations(text);
  const paxCount = pickPax(text);
  const names = pickNames(text);
  const interestParts = [
    destinations.length ? destinations.join(" → ") : null,
    pickDuration(text) ? `${pickDuration(text)} giorni` : null,
    paxCount ? `${paxCount} pax` : null,
  ].filter(Boolean);

  let confidence = 0.2;
  if (pickEmail(text) || pickPhone(text)) confidence += 0.2;
  if (destinations.length) confidence += 0.25;
  if (paxCount) confidence += 0.15;
  if (pickDeparture(text) || pickDuration(text)) confidence += 0.15;
  if (names.firstName) confidence += 0.05;

  return {
    firstName: names.firstName,
    lastName: names.lastName,
    email: pickEmail(text),
    phone: pickPhone(text),
    interest: interestParts.length
      ? interestParts.join(" · ")
      : text.split("\n").find((l) => l.trim().length > 20)?.trim().slice(0, 160) || null,
    destinations,
    paxCount,
    budgetHint: pickBudget(text),
    departureHint: pickDeparture(text),
    durationDays: pickDuration(text),
    tripType: pickTripType(text, paxCount),
    confidence: Math.min(1, confidence),
  };
}
