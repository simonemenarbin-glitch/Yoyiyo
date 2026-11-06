"use server";

import { redirect } from "next/navigation";
import type { ChannelKind, LeadSource } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultReplySubject,
  pickReplyAddress,
  sendOutboundMessage,
} from "@/lib/channels/send-outbound";

function preferredKind(source: LeadSource): ChannelKind | null {
  switch (source) {
    case "EMAIL":
      return "IMAP";
    case "WHATSAPP":
      return "WHATSAPP_CLOUD";
    case "INSTAGRAM":
      return "META_INSTAGRAM";
    case "FACEBOOK":
      return "META_FACEBOOK";
    case "WEB":
      return "WEB_FORM";
    default:
      return null;
  }
}

async function resolveSendConnection(orgId: string, source: LeadSource, connectionId?: string) {
  if (connectionId) {
    const c = await prisma.channelConnection.findFirst({
      where: { id: connectionId, organizationId: orgId, enabled: true },
    });
    if (c) return c;
  }
  const kind = preferredKind(source);
  if (kind) {
    const byKind = await prisma.channelConnection.findFirst({
      where: { organizationId: orgId, kind, enabled: true },
      orderBy: { updatedAt: "desc" },
    });
    if (byKind) return byKind;
  }
  // fallback: any IMAP with secret for email replies
  if (source === "EMAIL" || source === "WEB") {
    return prisma.channelConnection.findFirst({
      where: { organizationId: orgId, kind: "IMAP", enabled: true, secret: { not: null } },
    });
  }
  return null;
}

export async function sendLeadReply(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const leadId = String(formData.get("leadId") || "");
  const body = String(formData.get("draftReply") || "").trim();
  const subjectInput = String(formData.get("subject") || "").trim();
  const toInput = String(formData.get("toAddress") || "").trim();
  const connectionId = String(formData.get("connectionId") || "") || undefined;
  const confirm = formData.get("confirmSend") === "1";
  const simulate = formData.get("simulate") === "1";

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
  });
  if (!lead) redirect("/app/crm");

  if (!body) {
    redirect(`/app/crm/leads/${lead.id}?send=empty`);
  }
  if (!confirm) {
    redirect(`/app/crm/leads/${lead.id}?send=need_confirm`);
  }

  const to = toInput || pickReplyAddress(lead);
  if (!to) {
    redirect(`/app/crm/leads/${lead.id}?send=no_address`);
  }

  const connection = await resolveSendConnection(orgId, lead.source, connectionId);
  if (!connection && !simulate) {
    redirect(`/app/crm/leads/${lead.id}?send=no_channel`);
  }

  const subject = subjectInput || defaultReplySubject(lead, lead.source);

  // Persist draft first
  await prisma.lead.update({
    where: { id: lead.id },
    data: { draftReply: body, lastActivityAt: new Date() },
  });

  const msg = await prisma.conversationMessage.create({
    data: {
      organizationId: orgId,
      leadId: lead.id,
      connectionId: connection?.id || null,
      userId: user.id,
      direction: "OUT",
      source: lead.source,
      channelKind: connection?.kind || null,
      status: "QUEUED",
      toAddress: to,
      fromAddress: connection?.username || null,
      subject,
      body,
    },
  });

  const result = await sendOutboundMessage({
    connection,
    lead,
    to,
    subject,
    body,
    simulate: simulate || !connection,
  });

  if (!result.ok) {
    await prisma.conversationMessage.update({
      where: { id: msg.id },
      data: { status: "FAILED", errorText: result.error || "Invio fallito" },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        action: "REPLY_SEND_FAILED",
        entityType: "Lead",
        entityId: lead.id,
        metaJson: JSON.stringify({ messageId: msg.id, error: result.error }),
      },
    });
    redirect(`/app/crm/leads/${lead.id}?send=fail`);
  }

  await prisma.conversationMessage.update({
    where: { id: msg.id },
    data: {
      status: "SENT",
      providerId: result.providerId || null,
      sentAt: new Date(),
      errorText: result.simulated ? "Simulato (nessun provider live)" : null,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      pipelineStage:
        lead.pipelineStage === "NEW" || lead.pipelineStage === "CONTACTED"
          ? "CONTACTED"
          : lead.pipelineStage,
      lastActivityAt: new Date(),
      notes: `${lead.notes || ""}\nRisposta inviata ${new Date().toISOString()}${result.simulated ? " (simulata)" : ""}`.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: result.simulated ? "REPLY_SEND_SIMULATED" : "REPLY_SEND",
      entityType: "Lead",
      entityId: lead.id,
      metaJson: JSON.stringify({
        messageId: msg.id,
        to,
        providerId: result.providerId,
        channel: connection?.label,
      }),
    },
  });

  redirect(`/app/crm/leads/${lead.id}?send=ok${result.simulated ? "&sim=1" : ""}`);
}
