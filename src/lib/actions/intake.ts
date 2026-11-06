"use server";

import { redirect } from "next/navigation";
import type { LeadSource } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateIntake } from "@/lib/intake/evaluate";
import { parseLeadSource } from "@/lib/intake/parse-source";
import {
  buildBaseQuoteForLead,
  processInboundMessage,
} from "@/lib/intake/process-inbound";
import { refineDraftWithAi } from "@/lib/intake/refine-ai";
import type { MissingFieldKey, ParsedLeadFields } from "@/lib/intake/types";
import { leadSourceLabel } from "@/lib/labels";

export async function ingestSourceMessage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const raw = String(formData.get("rawSourceText") || "").trim();
  const source = (String(formData.get("source") || "EMAIL") as LeadSource) || "EMAIL";
  const sourceDetail = String(formData.get("sourceDetail") || "") || null;
  const brandId = String(formData.get("brandId") || "") || null;
  const autoQuote = formData.get("autoQuote") === "1";

  if (!raw) redirect("/app/crm/intake");

  const result = await processInboundMessage({
    organizationId: orgId,
    userId: user.id,
    brandId,
    source,
    sourceDetail,
    rawText: raw,
    autoQuote,
  });

  if (result.quoteId) redirect(`/app/preventivi/${result.quoteId}`);
  redirect(`/app/crm/leads/${result.leadId}`);
}

export async function generateBaseQuoteFromLead(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const leadId = String(formData.get("leadId") || "");
  const quoteId = await buildBaseQuoteForLead(leadId, membership.organizationId, user.id);
  if (!quoteId) redirect("/app/crm");
  redirect(`/app/preventivi/${quoteId}`);
}

export async function reprocessLeadIntake(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const leadId = String(formData.get("leadId") || "");
  const rawOverride = String(formData.get("rawSourceText") || "").trim();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: membership.organizationId },
  });
  if (!lead) redirect("/app/crm");

  const raw = rawOverride || lead.rawSourceText || "";
  if (!raw) redirect(`/app/crm/leads/${lead.id}`);

  const parsed = parseLeadSource(raw);
  const decision = evaluateIntake(parsed, {
    sourceLabel: leadSourceLabel[lead.source],
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      firstName: parsed.firstName || lead.firstName,
      lastName: parsed.lastName || lead.lastName,
      email: parsed.email || lead.email,
      phone: parsed.phone || lead.phone,
      interest: parsed.interest,
      paxCount: parsed.paxCount || lead.paxCount,
      budgetHint: parsed.budgetHint,
      departureHint: parsed.departureHint,
      durationDays: parsed.durationDays,
      destinationsJson: JSON.stringify(parsed.destinations),
      parsedJson: JSON.stringify(parsed),
      rawSourceText: raw,
      intakeStatus: decision.kind === "READY_TO_QUOTE" ? "READY_TO_QUOTE" : "NEEDS_INFO",
      pipelineStage:
        decision.kind === "READY_TO_QUOTE"
          ? lead.pipelineStage === "NEW"
            ? "QUALIFIED"
            : lead.pipelineStage
          : lead.pipelineStage,
      missingFieldsJson: JSON.stringify(decision.missing),
      draftReply: decision.kind === "NEEDS_INFO" ? decision.draftReply : lead.draftReply,
      notes:
        decision.kind === "READY_TO_QUOTE"
          ? "Intake rielaborato: dati sufficienti per preventivo base."
          : `Intake rielaborato: mancano ${decision.missing.join(", ")}.`,
      lastActivityAt: new Date(),
    },
  });

  redirect(`/app/crm/leads/${lead.id}`);
}

export async function saveDraftReply(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const leadId = String(formData.get("leadId") || "");
  const draftReply = String(formData.get("draftReply") || "");

  await prisma.lead.updateMany({
    where: { id: leadId, organizationId: membership.organizationId },
    data: { draftReply, lastActivityAt: new Date() },
  });

  redirect(`/app/crm/leads/${leadId}`);
}

export async function refineDraftReplyAi(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const leadId = String(formData.get("leadId") || "");
  const currentDraft = String(formData.get("draftReply") || "");

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: membership.organizationId },
  });
  if (!lead) redirect("/app/crm");

  const parsed: ParsedLeadFields = lead.parsedJson
    ? (JSON.parse(lead.parsedJson) as ParsedLeadFields)
    : parseLeadSource(lead.rawSourceText || "");
  const missing: MissingFieldKey[] = lead.missingFieldsJson
    ? (JSON.parse(lead.missingFieldsJson) as MissingFieldKey[])
    : [];

  const refined = await refineDraftWithAi({
    draft: currentDraft || lead.draftReply || "",
    missing,
    parsed,
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      draftReply: refined.text,
      notes: `${lead.notes || ""}\nAI refine (${refined.engine}) ${new Date().toISOString()}`.trim(),
      lastActivityAt: new Date(),
    },
  });

  redirect(`/app/crm/leads/${lead.id}`);
}
