import {
  BRAND,
  DESTINATIONS,
  FAQ,
  FORMULAS,
  ITINERARIES,
  type Formula,
  type Itinerary,
} from '../data/knowledge'

export type DeskMode = 'programma' | 'email' | 'formula' | 'faq'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  mode: DeskMode
}

const MODE_HINTS: Record<DeskMode, string> = {
  programma:
    'Esempio: «Coppia, 12 giorni, prima volta, Pechino Xi’an Guilin Shanghai, ritmo medio».',
  email:
    'Esempio: «Rispondi all’agenzia: cliente vuole Zhangjiajie + panda, 14 giorni a ottobre».',
  formula:
    'Esempio: «Famiglia di 5, vuole muoversi da sola con transfer e hotel, no guida tutti i giorni».',
  faq: 'Esempio: «Serve il visto nel 2026?» oppure «Quanto costa un viaggio in Cina?»',
}

export function modeHint(mode: DeskMode): string {
  return MODE_HINTS[mode]
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function extractDays(input: string): number | null {
  const m = input.match(/(\d{1,2})\s*(?:gg|giorni|day|days)/i)
  if (m) return Number(m[1])
  const alone = input.match(/\b(\d{1,2})\b/)
  if (alone) {
    const n = Number(alone[1])
    if (n >= 5 && n <= 30) return n
  }
  return null
}

function scoreItinerary(it: Itinerary, q: string): number {
  const n = normalize(q)
  let score = 0
  for (const city of it.cities) {
    if (n.includes(normalize(city))) score += 3
  }
  for (const token of it.idealFor.split(/,\s*/)) {
    if (n.includes(normalize(token))) score += 2
  }
  if (n.includes(normalize(it.title))) score += 4
  const days = extractDays(q)
  if (days != null) score += Math.max(0, 4 - Math.abs(it.days - days))
  if (/prima volta|classico|iconic/.test(n) && it.id === 'classico') score += 3
  if (/breve|settimana|8/.test(n) && it.id === 'triangolo') score += 2
  return score
}

function pickItineraries(q: string, limit = 2): Itinerary[] {
  return [...ITINERARIES]
    .map((it) => ({ it, score: scoreItinerary(it, q) }))
    .sort((a, b) => b.score - a.score)
    .filter((x, i) => x.score > 0 || i < 1)
    .slice(0, limit)
    .map((x) => x.it)
}

function detectFormula(q: string): Formula {
  const n = normalize(q)
  if (/groupage|amici|famiglia di [4-9]|siamo in [4-9]|nucleo/.test(n)) return 'groupage'
  if (
    /qualcuno ogni giorno|accompagnat|listino|prezzo pronto|programma chiuso|tour pront|sic|partenza garant/.test(
      n,
    )
  ) {
    return 'tour-pronti'
  }
  if (
    /muover|autonom|semi[- ]?autonom|ritmo|su misura|fit|individual|privato|no guida|senza guida/.test(
      n,
    )
  ) {
    return 'su-misura'
  }
  if (/gruppo|base 4|base 2|cinaingruppo/.test(n)) return 'tour-pronti'
  return 'su-misura'
}

function dayProgram(it: Itinerary): string {
  const legs = it.cities
  const lines: string[] = []
  let day = 1
  for (let i = 0; i < legs.length; i++) {
    const city = legs[i]
    const stay = i === 0 || i === legs.length - 1 ? 2 : Math.max(1, Math.floor(it.days / legs.length))
    for (let d = 0; d < stay && day <= it.days; d++) {
      if (d === 0 && i === 0) {
        lines.push(`Giorno ${day} — Arrivo ${city}. Accoglienza e sistemazione.`)
      } else if (d === 0) {
        lines.push(`Giorno ${day} — Trasferimento / volo interno verso ${city}.`)
      } else {
        lines.push(`Giorno ${day} — ${city}: visite principali e tempo libero calibrato.`)
      }
      day++
    }
  }
  while (day <= it.days) {
    const last = legs[legs.length - 1]
    if (day === it.days) {
      lines.push(`Giorno ${day} — Partenza da ${last}. Assistenza al transfer aeroportuale.`)
    } else {
      lines.push(`Giorno ${day} — ${last}: giornata a disposizione / approfondimento.`)
    }
    day++
  }
  return lines.join('\n')
}

function buildProgramma(q: string): string {
  const [primary, alt] = pickItineraries(q, 2)
  const days = extractDays(q) ?? primary.days
  const n = normalize(q)
  const pax = /coppia|2 pax|due/.test(n)
    ? '2 pax'
    : /famiglia|3|4|5/.test(n)
      ? 'nucleo famigliare'
      : 'pax da confermare'
  const regime = /autonom/.test(n)
    ? 'Autonomo (logistica solida, guida quasi zero)'
    : /semi/.test(n)
      ? 'Semi-autonomo (guida sulle giornate chiave)'
      : 'Da definire: semi-autonomo o autonomo'

  return [
    `PROGRAMMA DI VIAGGIO CINA — bozza Desk AI`,
    `Base: ${primary.title} (${primary.days} gg) · Adattamento richiesto: ${days} giorni · ${pax}`,
    `Formula suggerita: Su misura — ${regime}`,
    ``,
    `Sintesi`,
    primary.blurb,
    `Tappe: ${primary.cities.join(' · ')}`,
    ``,
    `Traccia giorno per giorno (da personalizzare)`,
    dayProgram({ ...primary, days }),
    ``,
    `Note operative`,
    `◆ Contratto italiano MTI SRL / Yoyiyo · assistenza e hotline in italiano`,
    `◆ Visa-free italiani fino al 31/12/2026 (max 30 giorni)`,
    `◆ Zero shopping stop forzati`,
    `◆ Prezzi e hotel: preventivo dedicato su richiesta`,
    ``,
    alt
      ? `Alternativa da proporre: ${alt.title} (${alt.days} gg) — ${alt.blurb}\n${alt.url}`
      : '',
    ``,
    `Scheda base: ${primary.url}`,
    `Desk B2B: ${BRAND.emailB2b} · WhatsApp ${BRAND.whatsapp}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildEmail(q: string): string {
  const formula = detectFormula(q)
  const [it] = pickItineraries(q, 1)
  const f = FORMULAS[formula]

  return [
    `Oggetto: Cina — proposta ${f.label.toLowerCase()} per il vostro cliente`,
    ``,
    `Buongiorno,`,
    ``,
    `grazie per la richiesta. Dal brief («${q.trim()}») vi proponiamo la formula ${f.label}.`,
    ``,
    f.summary,
    ``,
    `Base di lavoro consigliata: ${it.title} (${it.days} giorni)`,
    `${it.blurb}`,
    `Tappe: ${it.cities.join(' · ')}`,
    `Scheda: ${it.url}`,
    ``,
    `Se confermate date, ritmo (semi-autonomo / autonomo) e livello hotel, prepariamo preventivo FIT confidenziale.`,
    ``,
    `Restiamo a disposizione per un webinar commerciale dedicato: ${BRAND.webinar}`,
    ``,
    `Cordiali saluti,`,
    `Team Yoyiyo · Desk agenzie`,
    `${BRAND.emailB2b} · ${BRAND.whatsapp}`,
    `${BRAND.seat}`,
  ].join('\n')
}

function buildFormula(q: string): string {
  const chosen = detectFormula(q)
  const f = FORMULAS[chosen]
  const others = (Object.keys(FORMULAS) as Formula[]).filter((k) => k !== chosen)

  return [
    `Una domanda basta: volete qualcuno ogni giorno, o volete muovervi?`,
    ``,
    `Consiglio Desk AI → ${f.label}`,
    f.summary,
    ``,
    `Perché questa formula`,
    `Dal testo del cliente/agenzia: «${q.trim()}»`,
    `Allineamento: ${f.question}`,
    ``,
    `Prossimo passo: ${f.cta}`,
    f.link,
    ``,
    `Le altre due (per non mischiarle nello stesso PDF):`,
    ...others.map((k) => `· ${FORMULAS[k].label}: ${FORMULAS[k].question}`),
    ``,
    `Tour pronti → ${BRAND.groups}`,
    `Su misura / Groupage → ${BRAND.site} · ${BRAND.emailB2b}`,
  ].join('\n')
}

function buildFaq(q: string): string {
  for (const item of FAQ) {
    if (item.q.test(q)) {
      return `${item.a}\n\nFonti operative: ${BRAND.site} · B2B ${BRAND.emailB2b}`
    }
  }

  const dest = DESTINATIONS.find((d) =>
    d.aliases.some((a) => normalize(q).includes(normalize(a))),
  )
  if (dest) {
    const related = ITINERARIES.filter((it) =>
      it.cities.some((c) => normalize(c).includes(normalize(dest.name)) || normalize(dest.name).includes(normalize(c))),
    ).slice(0, 2)
    return [
      `${dest.name} — ${dest.pitch}`,
      ``,
      related.length
        ? `Itinerari che la includono:\n${related.map((r) => `· ${r.title} (${r.days} gg) — ${r.url}`).join('\n')}`
        : `Possiamo combinare ${dest.name} in qualsiasi rotta FIT.`,
      ``,
      `Per un preventivo: ${BRAND.emailB2b}`,
    ].join('\n')
  }

  const [it] = pickItineraries(q, 1)
  return [
    `Non ho una FAQ esatta su quel punto, ma ecco l’inquadramento Yoyiyo:`,
    ``,
    `· DMC / TO italiano (MTI SRL, Bologna) con ops diretta in Cina`,
    `· Tre formule separate: Tour pronti · Su misura · Groupage`,
    `· Assistenza sempre in italiano, contratto europeo`,
    ``,
    `Spunto prodotto più vicino: ${it.title} — ${it.blurb}`,
    it.url,
    ``,
    `Riformula la domanda (visto, prezzo, prima volta, formula…) oppure scrivi a ${BRAND.emailB2b}.`,
  ].join('\n')
}

export function answerDesk(mode: DeskMode, input: string): string {
  const q = input.trim()
  if (!q) {
    return 'Scrivi un brief: destinazione, giorni, tipo di cliente e cosa vuole ottenere.'
  }
  switch (mode) {
    case 'programma':
      return buildProgramma(q)
    case 'email':
      return buildEmail(q)
    case 'formula':
      return buildFormula(q)
    case 'faq':
      return buildFaq(q)
  }
}

export const MODE_META: Record<
  DeskMode,
  { label: string; title: string; description: string }
> = {
  programma: {
    label: 'Programma',
    title: 'Bozza programma di viaggio',
    description: 'Traccia giorno per giorno in stile foglio notizie, pronta da raffinare.',
  },
  email: {
    label: 'Email / WA',
    title: 'Bozza risposta agenzia',
    description: 'Testo pronto da inviare al collega o al cliente, con formula e scheda.',
  },
  formula: {
    label: 'Formula',
    title: 'Tour pronti · Su misura · Groupage',
    description: 'Scegli la formula giusta — senza mischiarle nello stesso PDF.',
  },
  faq: {
    label: 'FAQ desk',
    title: 'Risposte operative',
    description: 'Visto, prezzi, prima volta, lingue, destinazioni.',
  },
}
