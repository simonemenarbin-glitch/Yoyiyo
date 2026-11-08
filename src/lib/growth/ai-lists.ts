import type { ClientType, Lead, LeadSource, PipelineStage } from "@prisma/client";

export type ListCriteria = {
  prompt?: string;
  sources?: LeadSource[];
  stages?: PipelineStage[];
  clientTypes?: ClientType[];
  brandId?: string | null;
  minPax?: number | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
  query?: string;
};

export type ListMember = {
  leadId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  stage: PipelineStage;
  clientType: ClientType;
};

/** Offline “AI” segmenter: parses Italian/English keywords into CRM filters, then scores leads. */
export function parseAudiencePrompt(prompt: string): ListCriteria {
  const p = prompt.toLowerCase();
  const criteria: ListCriteria = { prompt };

  if (/whatsapp|\bwa\b/.test(p)) criteria.sources = [...(criteria.sources || []), "WHATSAPP"];
  if (/instagram|\big\b/.test(p)) criteria.sources = [...(criteria.sources || []), "INSTAGRAM"];
  if (/facebook|\bfb\b|messenger/.test(p)) criteria.sources = [...(criteria.sources || []), "FACEBOOK"];
  if (/email|mail/.test(p)) criteria.sources = [...(criteria.sources || []), "EMAIL"];
  if (/sito|web|landing|form/.test(p)) criteria.sources = [...(criteria.sources || []), "WEB"];

  if (/nuov|new\b/.test(p)) criteria.stages = [...(criteria.stages || []), "NEW"];
  if (/qualificat/.test(p)) criteria.stages = [...(criteria.stages || []), "QUALIFIED"];
  if (/preventiv|quot/.test(p)) criteria.stages = [...(criteria.stages || []), "QUOTING"];
  if (/negoz/.test(p)) criteria.stages = [...(criteria.stages || []), "NEGOTIATION"];
  if (/\bvint|\bwon\b/.test(p)) criteria.stages = [...(criteria.stages || []), "WON"];
  if (/pers|lost/.test(p)) criteria.stages = [...(criteria.stages || []), "LOST"];

  if (/groupage|gruppo|>\s*20|comitato/.test(p)) {
    criteria.clientTypes = [...(criteria.clientTypes || []), "GROUP"];
    criteria.minPax = 20;
  }
  if (/\bb2b\b|agenz/.test(p)) criteria.clientTypes = [...(criteria.clientTypes || []), "B2B"];
  if (/\bb2c\b|privat|coppie|fit\b/.test(p)) criteria.clientTypes = [...(criteria.clientTypes || []), "B2C"];

  if (/con email|has email/.test(p)) criteria.hasEmail = true;
  if (/con telefono|whatsapp|phone|cell/.test(p)) criteria.hasPhone = true;

  const dest = p.match(/\b(pechino|shanghai|xi['’]?an|guilin|zhangjiajie|chengdu|cina)\b/);
  if (dest) criteria.query = dest[1];

  // dedupe arrays
  if (criteria.sources) criteria.sources = [...new Set(criteria.sources)];
  if (criteria.stages) criteria.stages = [...new Set(criteria.stages)];
  if (criteria.clientTypes) criteria.clientTypes = [...new Set(criteria.clientTypes)];

  return criteria;
}

export function buildAudienceFromLeads(
  leads: Lead[],
  criteria: ListCriteria,
): { members: ListMember[]; criteria: ListCriteria } {
  const q = (criteria.query || "").toLowerCase();

  const members = leads
    .filter((l) => {
      if (criteria.brandId && l.brandId !== criteria.brandId) return false;
      if (criteria.sources?.length && !criteria.sources.includes(l.source)) return false;
      if (criteria.stages?.length && !criteria.stages.includes(l.pipelineStage)) return false;
      if (criteria.clientTypes?.length && !criteria.clientTypes.includes(l.clientType)) return false;
      if (criteria.minPax != null && (l.paxCount || 0) < criteria.minPax) return false;
      if (criteria.hasEmail && !l.email) return false;
      if (criteria.hasPhone && !l.phone) return false;
      if (q) {
        const blob = `${l.interest || ""} ${l.rawSourceText || ""} ${l.notes || ""} ${l.firstName} ${l.lastName}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    })
    .map((l) => ({
      leadId: l.id,
      name: `${l.firstName} ${l.lastName}`.trim(),
      email: l.email,
      phone: l.phone,
      source: l.source,
      stage: l.pipelineStage,
      clientType: l.clientType,
    }));

  return { members, criteria };
}

export const AUDIENCE_PROMPT_EXAMPLES = [
  "Lead Instagram nuovi interessati a Pechino",
  "Groupage >20 da Facebook o WhatsApp con telefono",
  "B2B agenzie in preventivo con email",
  "FIT B2C da landing web qualificati",
];
