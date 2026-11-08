import type { SiteBlock } from "@/lib/brand/metrics";

export type LandingTemplateId =
  | "fit-cina"
  | "groupage"
  | "partner-b2b"
  | "evento-fiera"
  | "short-form";

export type LandingTemplate = {
  id: LandingTemplateId;
  name: string;
  description: string;
  pageType: "LANDING" | "HOME" | "FORM" | "CATALOG" | "CONTENT";
  suggestedSlug: string;
  ctaLabel: string;
  blocks: (brandName: string) => SiteBlock[];
};

/** LeadConnector-style starter funnels adapted for Italian tour operators. */
export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    id: "fit-cina",
    name: "FIT Cina su misura",
    description: "Hero + punti di forza + itinerario + form lead B2C.",
    pageType: "LANDING",
    suggestedSlug: "cina-su-misura",
    ctaLabel: "Richiedi preventivo",
    blocks: (brandName) => [
      {
        type: "hero",
        title: `Viaggia in Cina con ${brandName}`,
        subtitle: "Ipotesi di land su misura — non un programma chiuso.",
        ctaLabel: "Richiedi preventivo",
      },
      {
        type: "features",
        items: [
          { title: "Listino proprio + API", text: "Quote chiuse, hotel e servizi aggiornabili." },
          { title: "Assistenza IT", text: "Ufficio booking italiano e backoffice in Cina." },
          { title: "WeChat 24h", text: "Assistenza sugli imprevisti del viaggio organizzato." },
        ],
      },
      {
        type: "itinerary",
        days: [
          { title: "Pechino", text: "Città Proibita, Muraglia, guida in italiano." },
          { title: "Xi’an", text: "Esercito di terracotta, guida in italiano." },
          { title: "Shanghai", text: "Bund e quartieri contemporanei con accompagnatore IT." },
        ],
      },
      {
        type: "gallery",
        items: [
          { caption: "Muraglia · Pechino" },
          { caption: "Terracotta · Xi’an" },
          { caption: "Bund · Shanghai" },
        ],
      },
      {
        type: "form",
        title: "Raccontaci cosa cercate",
        fields: ["nome", "email", "pax", "periodo", "messaggio"],
      },
      {
        type: "faq",
        items: [
          {
            q: "Il preventivo è vincolante?",
            a: "No: è un’ipotesi di lavoro chiusa nei numeri, ricalibrabile finché non confermate.",
          },
          {
            q: "Serve un budget minimo?",
            a: "No. Partiamo da periodo, pax e ritmo: i numeri arrivano dopo.",
          },
        ],
      },
      {
        type: "trust",
        items: [
          "Validità preventivo 7 giorni",
          "Ipotesi senza budget, ricalibrabile",
          "Multi-brand Yoyiyo",
        ],
      },
    ],
  },
  {
    id: "groupage",
    name: "Groupage / partenze",
    description: "Partenze garantite, acconto 10%, release 120 giorni.",
    pageType: "LANDING",
    suggestedSlug: "groupage",
    ctaLabel: "Chiedi una data",
    blocks: (brandName) => [
      {
        type: "hero",
        title: `${brandName}: groupage Cina`,
        subtitle: "Circuiti oltre 20 pax con acconto 10% e release 120 giorni.",
        ctaLabel: "Chiedi una data",
      },
      {
        type: "features",
        items: [
          { title: "Acconto 10%", text: "Rimborsabile fino al release ufficiale." },
          { title: "Release 120 gg", text: "Scala penali chiara dopo la conferma." },
          { title: "Ufficio booking IT", text: "Un referente per comitato e agenzia." },
        ],
      },
      {
        type: "text",
        title: "Come funziona",
        body: "Ci mandate periodo e numero pax. Vi proponiamo un’ipotesi di circuito con hotel e servizi. Alla conferma: acconto 10%, release a 120 giorni, poi scala 15/30/50/75/100.",
      },
      {
        type: "cta",
        title: "Avete già una data in mente?",
        subtitle: "Lasciate i dati: vi rispondiamo con disponibilità e ipotesi di costo.",
        ctaLabel: "Chiedi una data",
      },
      {
        type: "form",
        title: "Richiesta groupage",
        fields: ["nome", "email", "telefono", "pax", "periodo", "messaggio"],
      },
      {
        type: "trust",
        items: ["Policy groupage >20", "Acconto 10%", "Release 120 giorni"],
      },
    ],
  },
  {
    id: "partner-b2b",
    name: "Partner B2B / agenzie",
    description: "Landing per agenzie: net, listini, promoter.",
    pageType: "LANDING",
    suggestedSlug: "partner",
    ctaLabel: "Diventa partner",
    blocks: (brandName) => [
      {
        type: "hero",
        title: `Partnership ${brandName}`,
        subtitle: "Listini net, promoter e pratiche condivise sul portale B2B.",
        ctaLabel: "Diventa partner",
      },
      {
        type: "features",
        items: [
          { title: "Net dedicati", text: "Margine agenzia sui circuiti Cina." },
          { title: "Portale promoter", text: "Link personale per le vostre richieste." },
          { title: "Backoffice Cina", text: "Operativo locale, booking italiano." },
        ],
      },
      {
        type: "form",
        title: "Richiesta partnership",
        fields: ["nome", "email", "telefono", "messaggio"],
      },
      {
        type: "faq",
        items: [
          {
            q: "Serve un volume minimo?",
            a: "No per l’onboarding. I net si calibrano sul vostro mix FIT/groupage.",
          },
        ],
      },
    ],
  },
  {
    id: "evento-fiera",
    name: "Evento / fiera",
    description: "Cattura lead da stand o webinar con UTM campagna.",
    pageType: "LANDING",
    suggestedSlug: "evento",
    ctaLabel: "Prenota call",
    blocks: (brandName) => [
      {
        type: "hero",
        title: `Incontraci · ${brandName}`,
        subtitle: "Lascia i dati allo stand: ti richiamiamo con un’ipotesi di viaggio.",
        ctaLabel: "Prenota call",
      },
      {
        type: "gallery",
        items: [
          { caption: "Stand fiera" },
          { caption: "Workshop destinazioni" },
          { caption: "Networking B2B" },
        ],
      },
      {
        type: "form",
        title: "Contatto evento",
        fields: ["nome", "email", "telefono", "periodo", "messaggio"],
      },
      {
        type: "cta",
        title: "Preferisci WhatsApp?",
        subtitle: "Scrivici dal form: ti rispondiamo sul canale che indichi.",
        ctaLabel: "Invia richiesta",
      },
    ],
  },
  {
    id: "short-form",
    name: "Form corto",
    description: "Solo hero + form: ideale ads Meta / TikTok.",
    pageType: "FORM",
    suggestedSlug: "richiesta",
    ctaLabel: "Invia",
    blocks: (brandName) => [
      {
        type: "hero",
        title: `Richiesta ${brandName}`,
        subtitle: "Tre campi bastano per una prima ipotesi.",
        ctaLabel: "Invia",
      },
      {
        type: "form",
        title: "I tuoi dati",
        fields: ["nome", "email", "periodo", "messaggio"],
      },
    ],
  },
];

export function getLandingTemplate(id: string | null | undefined): LandingTemplate | null {
  if (!id) return null;
  return LANDING_TEMPLATES.find((t) => t.id === id) || null;
}

export function applyLandingTemplate(
  templateId: string,
  brandName: string,
): { blocks: SiteBlock[]; pageType: LandingTemplate["pageType"]; ctaLabel: string; suggestedSlug: string; name: string } | null {
  const tpl = getLandingTemplate(templateId);
  if (!tpl) return null;
  return {
    blocks: tpl.blocks(brandName),
    pageType: tpl.pageType,
    ctaLabel: tpl.ctaLabel,
    suggestedSlug: tpl.suggestedSlug,
    name: tpl.name,
  };
}
