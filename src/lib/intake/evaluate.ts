import { missingFieldLabel, type IntakeDecision, type MissingFieldKey, type ParsedLeadFields } from "./types";
import { buildDraftReply } from "./draft-reply";

/** Campi minimi per un preventivo base automatico. */
export function evaluateIntake(
  parsed: ParsedLeadFields,
  opts?: { sourceLabel?: string; contactNameFallback?: string },
): IntakeDecision {
  const missing: MissingFieldKey[] = [];

  const hasContact =
    Boolean(parsed.email || parsed.phone) &&
    Boolean(parsed.firstName || parsed.lastName);
  if (!hasContact) missing.push("contact");

  if (!parsed.destinations.length && !parsed.interest) missing.push("destination");
  if (!parsed.paxCount) missing.push("pax");
  if (!parsed.departureHint) missing.push("dates");
  if (!parsed.durationDays) missing.push("duration");
  // tripType is soft: inferred from pax when possible; only block if completely unknown AND no pax
  if (parsed.tripType === "UNKNOWN" && !parsed.paxCount) missing.push("tripType");

  // Enough for base quote: contact + destination + pax + (dates OR duration)
  const hardMissing = missing.filter((k) =>
    ["contact", "destination", "pax"].includes(k),
  );
  const hasTiming = Boolean(parsed.departureHint || parsed.durationDays);
  const ready = hardMissing.length === 0 && hasTiming && parsed.confidence >= 0.45;

  if (ready) {
    return {
      kind: "READY_TO_QUOTE",
      missing: missing.filter((k) => k === "dates" || k === "duration" || k === "tripType"),
      parsed,
    };
  }

  return {
    kind: "NEEDS_INFO",
    missing,
    parsed,
    draftReply: buildDraftReply({
      parsed,
      missing,
      sourceLabel: opts?.sourceLabel,
      contactName: opts?.contactNameFallback,
    }),
  };
}

export function describeMissing(missing: MissingFieldKey[]) {
  return missing.map((k) => missingFieldLabel[k]);
}
