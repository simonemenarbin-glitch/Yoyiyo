import { missingFieldLabel, type MissingFieldKey, type ParsedLeadFields } from "./types";

export function buildDraftReply(input: {
  parsed: ParsedLeadFields;
  missing: MissingFieldKey[];
  sourceLabel?: string;
  contactName?: string;
}) {
  const name =
    [input.parsed.firstName, input.parsed.lastName].filter(Boolean).join(" ") ||
    input.contactName ||
    "";
  const greeting = name ? `Buongiorno ${name},` : "Buongiorno,";
  const known: string[] = [];
  if (input.parsed.destinations.length) {
    known.push(`destinazioni: ${input.parsed.destinations.join(", ")}`);
  } else if (input.parsed.interest) {
    known.push(`richiesta: ${input.parsed.interest}`);
  }
  if (input.parsed.paxCount) known.push(`${input.parsed.paxCount} persone`);
  if (input.parsed.durationDays) known.push(`${input.parsed.durationDays} giorni`);
  if (input.parsed.departureHint) known.push(`periodo ${input.parsed.departureHint}`);
  if (input.parsed.budgetHint) known.push(`fascia circa € ${input.parsed.budgetHint}`);

  const asks = input.missing.map((k) => `• ${missingFieldLabel[k]}`);

  return [
    greeting,
    "",
    "grazie per la richiesta: l’abbiamo presa in carico.",
    known.length
      ? `Da quello che leggiamo oggi risulta: ${known.join("; ")}.`
      : "Per costruire un’ipotesi di land chiara ci servono ancora alcuni dettagli.",
    "",
    "Per prepararvi un preventivo base (listino proprio + eventuali servizi da API fornitori) ci servono:",
    ...asks,
    "",
    "Appena ci mandate questi punti vi restituiamo un’ipotesi di lavoro chiusa nei numeri — non un programma chiuso — da ricalibrare insieme.",
    "",
    "Restiamo a disposizione,",
    "Ufficio Booking / Yoyiyo",
  ].join("\n");
}
