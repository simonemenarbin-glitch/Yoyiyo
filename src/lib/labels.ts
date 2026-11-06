import type {
  BrandStatus,
  CampaignChannel,
  CampaignStatus,
  ClientType,
  IntakeStatus,
  LeadSource,
  MembershipRole,
  PipelineStage,
  PracticeStatus,
  PriceSource,
  ProductType,
  QuoteStatus,
  SalesChannel,
  SitePageStatus,
  SitePageType,
} from "@prisma/client";
import { missingFieldLabel as missingFieldLabelMap } from "@/lib/intake/types";
import type { MissingFieldKey } from "@/lib/intake/types";

export const missingFieldLabel: Record<MissingFieldKey, string> = missingFieldLabelMap;

export const productTypeLabel: Record<ProductType, string> = {
  HOTEL: "Hotel",
  FLIGHT: "Volo",
  TRANSFER: "Transfer",
  EXCURSION: "Escursione",
  CRUISE: "Crociera",
  FERRY: "Traghetto",
  INSURANCE: "Assicurazione",
  PACKAGE: "Pacchetto",
  OTHER: "Altro",
};

export const practiceStatusLabel: Record<PracticeStatus, string> = {
  DRAFT: "Bozza",
  QUOTED: "Preventivata",
  CONFIRMED: "Confermata",
  IN_PROGRESS: "In corso",
  COMPLETED: "Completata",
  CANCELLED: "Annullata",
};

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
  EXPIRED: "Scaduto",
};

export const channelLabel: Record<SalesChannel, string> = {
  WEB: "Sito",
  B2B: "B2B",
  COUNTER: "Banco",
  LANDING: "Landing",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

export const leadSourceLabel: Record<LeadSource, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WEB: "Sito / form",
  PHONE: "Telefono",
  REFERRAL: "Referral",
  OTHER: "Altro",
};

export const pipelineStageLabel: Record<PipelineStage, string> = {
  NEW: "Nuovo",
  CONTACTED: "Contattato",
  QUALIFIED: "Qualificato",
  QUOTING: "In preventivo",
  NEGOTIATION: "Negoziazione",
  WON: "Vinto",
  LOST: "Perso",
};

export const pipelineStagesOrdered: PipelineStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTING",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const priceSourceLabel: Record<PriceSource, string> = {
  OWN_LIST: "Listino proprio",
  SUPPLIER_API: "API fornitore",
  MANUAL: "Manuale",
};

export const intakeStatusLabel: Record<IntakeStatus, string> = {
  RAW: "Grezzo",
  PARSED: "Letto",
  READY_TO_QUOTE: "Pronto a quotare",
  QUOTED: "Preventivato",
  NEEDS_INFO: "Servono dati",
};

export const clientTypeLabel: Record<ClientType, string> = {
  B2C: "B2C / privato",
  B2B: "B2B / agenzia",
  GROUP: "Groupage",
  OTHER: "Altro",
};

export const clientTypesOrdered: ClientType[] = ["B2C", "B2B", "GROUP", "OTHER"];

export const roleLabel: Record<MembershipRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  OPERATOR: "Operatore",
  AGENT: "Agente",
  READONLY: "Sola lettura",
};

export const brandStatusLabel: Record<BrandStatus, string> = {
  DRAFT: "Bozza",
  ACTIVE: "Attivo",
  ARCHIVED: "Archiviato",
};

export const campaignChannelLabel: Record<CampaignChannel, string> = {
  EMAIL: "Email",
  SOCIAL: "Social organico",
  ADS: "Ads a pagamento",
  LANDING: "Landing / sito",
  WHATSAPP: "WhatsApp",
  SEO: "SEO / organico",
  PARTNER: "Partner / B2B",
  OTHER: "Altro",
};

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  DRAFT: "Bozza",
  SCHEDULED: "Programmata",
  LIVE: "Live",
  PAUSED: "In pausa",
  ENDED: "Terminata",
};

export const campaignChannelsOrdered: CampaignChannel[] = [
  "LANDING",
  "ADS",
  "SOCIAL",
  "EMAIL",
  "WHATSAPP",
  "SEO",
  "PARTNER",
  "OTHER",
];

export const campaignStatusesOrdered: CampaignStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "LIVE",
  "PAUSED",
  "ENDED",
];

export const sitePageTypeLabel: Record<SitePageType, string> = {
  HOME: "Home",
  LANDING: "Landing",
  CATALOG: "Catalogo",
  FORM: "Form lead",
  CONTENT: "Contenuto",
};

export const sitePageStatusLabel: Record<SitePageStatus, string> = {
  DRAFT: "Bozza",
  PUBLISHED: "Pubblicata",
  ARCHIVED: "Archiviata",
};

export const sitePageTypesOrdered: SitePageType[] = [
  "LANDING",
  "HOME",
  "FORM",
  "CATALOG",
  "CONTENT",
];
