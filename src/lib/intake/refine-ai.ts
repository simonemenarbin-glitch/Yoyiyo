import { missingFieldLabel, type MissingFieldKey, type ParsedLeadFields } from "./types";

function localRefine(draft: string, missing: MissingFieldKey[], parsed: ParsedLeadFields) {
  const asks = missing.map((k) => missingFieldLabel[k]).join("; ");
  const known = [
    parsed.destinations.length ? parsed.destinations.join(", ") : null,
    parsed.paxCount ? `${parsed.paxCount} pax` : null,
    parsed.departureHint,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = draft
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Soft AI-like polish without external API: clearer CTA + numbered asks
  const numbered = missing
    .map((k, i) => `${i + 1}. ${missingFieldLabel[k]}`)
    .join("\n");

  const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(" ");
  return [
    name ? `Buongiorno ${name},` : "Buongiorno,",
    "",
    "grazie del messaggio: lo abbiamo letto e inquadrato come richiesta di preventivo.",
    known
      ? `Al momento risultano chiari questi elementi: ${known}.`
      : "Alcuni elementi utili al preventivo non sono ancora espliciti nel messaggio.",
    "",
    "Per prepararvi un’ipotesi di land chiusa nei numeri (listino Yoyiyo +, dove serve, quotazioni da API fornitori) ci servono ancora:",
    numbered || asks,
    "",
    "Potete rispondere pure punto per punto su questo stesso canale. Appena completiamo i dati, vi mandiamo la prima ipotesi di lavoro — modificabile insieme, non un programma chiuso.",
    "",
    "Ufficio Booking / Yoyiyo",
    "",
    "—",
    "Versione rivista (AI locale). Bozza originale conservata sotto se serve confronto.",
    "",
    body,
  ].join("\n");
}

async function openAiRefine(draft: string, missing: MissingFieldKey[], parsed: ParsedLeadFields) {
  const key = process.env.OPENAI_API_KEY || process.env.ROTTA_AI_API_KEY;
  if (!key) return null;

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.ROTTA_AI_MODEL || "gpt-4o-mini";

  const prompt = [
    "Sei l’Ufficio Booking di Yoyiyo. Riscrivi la bozza mail/WhatsApp in italiano professionale, chiaro, senza firmare con nomi di persona (firma: Ufficio Booking / Yoyiyo).",
    "Obiettivo: ottenere i dati mancanti per un preventivo base. Non inventare destinazioni o prezzi.",
    "Mantieni tono aperto: ipotesi di lavoro, non programma chiuso.",
    `Dati già noti: ${JSON.stringify(parsed)}`,
    `Dati mancanti: ${missing.map((m) => missingFieldLabel[m]).join("; ")}`,
    "Bozza da migliorare:",
    draft,
  ].join("\n\n");

  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: "Assistente booking tour operator Cina. Solo italiano." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.warn("[rotta] AI refine failed", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function refineDraftWithAi(input: {
  draft: string;
  missing: MissingFieldKey[];
  parsed: ParsedLeadFields;
}) {
  const remote = await openAiRefine(input.draft, input.missing, input.parsed);
  if (remote) {
    return { text: remote, engine: "api" as const };
  }
  return {
    text: localRefine(input.draft, input.missing, input.parsed),
    engine: "local" as const,
  };
}
