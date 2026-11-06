export type MissingFieldKey =
  | "contact"
  | "destination"
  | "pax"
  | "dates"
  | "duration"
  | "tripType";

export type ParsedLeadFields = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  destinations: string[];
  paxCount: number | null;
  budgetHint: number | null;
  departureHint: string | null;
  durationDays: number | null;
  tripType: "FIT" | "GROUP" | "UNKNOWN";
  confidence: number;
};

export type IntakeDecision =
  | {
      kind: "READY_TO_QUOTE";
      missing: MissingFieldKey[];
      parsed: ParsedLeadFields;
    }
  | {
      kind: "NEEDS_INFO";
      missing: MissingFieldKey[];
      parsed: ParsedLeadFields;
      draftReply: string;
    };

export const missingFieldLabel: Record<MissingFieldKey, string> = {
  contact: "nome e un contatto (email o telefono/WhatsApp)",
  destination: "destinazioni / itinerario richiesto",
  pax: "numero di persone",
  dates: "periodo o data di partenza indicativa",
  duration: "durata del viaggio in giorni",
  tripType: "se individuale/coppia oppure gruppo",
};
