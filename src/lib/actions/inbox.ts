"use server";

import { redirect } from "next/navigation";
import type { InboxThreadStatus } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncSandboxInbox } from "@/lib/inbox/sandbox-sync";
import { runCommercialAiOnLeadThread } from "@/lib/intake/from-inbox";
import {
  defaultReplySubject,
  pickReplyAddress,
  sendOutboundMessage,
} from "@/lib/channels/send-outbound";

export async function loadSandboxInbox(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const result = await syncSandboxInbox(prisma, membership.organizationId);

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      userId: user.id,
      action: "INBOX_SANDBOX_SYNC",
      entityType: "InboxThread",
      entityId: membership.organizationId,
      metaJson: JSON.stringify(result),
    },
  });

  const q = new URLSearchParams({
    threads: String(result.threadsUpserted),
    msgs: String(result.messagesCreated),
    leads: String(result.leadsCreated),
  });
  const back = String(formData.get("back") || "/app/inbox");
  redirect(`${back}?${q.toString()}`);
}

export async function markThreadRead(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const threadId = String(formData.get("threadId") || "");

  const thread = await prisma.inboxThread.findFirst({
    where: { id: threadId, organizationId: orgId },
  });
  if (!thread) redirect("/app/inbox");

  await prisma.conversationMessage.updateMany({
    where: { threadId, organizationId: orgId, unread: true },
    data: { unread: false },
  });
  await prisma.inboxThread.update({
    where: { id: threadId },
    data: { unreadCount: 0 },
  });
  redirect(`/app/inbox/${threadId}`);
}

export async function setThreadStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const threadId = String(formData.get("threadId") || "");
  const status = String(formData.get("status") || "OPEN") as InboxThreadStatus;

  await prisma.inboxThread.updateMany({
    where: { id: threadId, organizationId: membership.organizationId },
    data: { status },
  });
  redirect(`/app/inbox/${threadId}`);
}

/** AI commerciale: parse thread → update pipeline → auto-preventivo se READY. */
export async function runInboxCommercialAi(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const threadId = String(formData.get("threadId") || "");

  const result = await runCommercialAiOnLeadThread({
    organizationId: orgId,
    userId: user.id,
    threadId,
    autoQuote: true,
  });

  if (!result) redirect(`/app/inbox/${threadId}?ai=fail`);

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "AI_COMMERCIALE_INBOX",
      entityType: "InboxThread",
      entityId: threadId,
      metaJson: JSON.stringify(result),
    },
  });

  const q = new URLSearchParams({
    ai: "1",
    decision: result.decision,
    quote: result.quoteId || "",
    missing: result.missing.join(","),
  });
  redirect(`/app/inbox/${threadId}?${q.toString()}`);
}

/** Reply from unified inbox — defaults to sandbox simulate (no live Meta keys). */
export async function replyInboxThread(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const threadId = String(formData.get("threadId") || "");
  const body = String(formData.get("body") || "").trim();
  const confirm = formData.get("confirmSend") === "1";
  // Sandbox-first: simulate unless explicitly requesting live send
  const live = formData.get("live") === "1";
  const simulate = !live;

  const thread = await prisma.inboxThread.findFirst({
    where: { id: threadId, organizationId: orgId },
    include: { lead: true, connection: true },
  });
  if (!thread || !thread.lead) redirect("/app/inbox");
  if (!body) redirect(`/app/inbox/${threadId}?send=empty`);
  if (!confirm) redirect(`/app/inbox/${threadId}?send=need_confirm`);

  const lead = thread.lead;
  const to =
    thread.contactHandle ||
    pickReplyAddress(lead) ||
    lead.email ||
    lead.phone ||
    "sandbox@example.com";
  const subject = thread.subject || defaultReplySubject(lead, thread.source);

  const result = await sendOutboundMessage({
    connection: thread.connection,
    lead,
    to,
    subject,
    body,
    simulate,
  });

  const msg = await prisma.conversationMessage.create({
    data: {
      organizationId: orgId,
      leadId: lead.id,
      threadId: thread.id,
      connectionId: thread.connectionId,
      userId: user.id,
      direction: "OUT",
      source: thread.source,
      channelKind: thread.connection?.kind,
      kind: thread.kind,
      status: result.ok ? (simulate ? "LOGGED" : "SENT") : "FAILED",
      unread: false,
      toAddress: to,
      fromAddress: "sandbox@rotta.erp",
      subject,
      body,
      providerId: result.providerId || null,
      errorText: result.error || null,
      sentAt: result.ok ? new Date() : null,
    },
  });

  await prisma.inboxThread.update({
    where: { id: thread.id },
    data: {
      lastBody: body.slice(0, 280),
      lastAt: new Date(),
      unreadCount: 0,
      status: thread.status === "CLOSED" ? "OPEN" : thread.status,
    },
  });

  await prisma.conversationMessage.updateMany({
    where: { threadId: thread.id, unread: true },
    data: { unread: false },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      draftReply: body,
      lastActivityAt: new Date(),
      pipelineStage:
        lead.pipelineStage === "NEW" ? "CONTACTED" : lead.pipelineStage,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: result.ok ? "INBOX_REPLY" : "INBOX_REPLY_FAILED",
      entityType: "ConversationMessage",
      entityId: msg.id,
      metaJson: JSON.stringify({
        threadId,
        simulate,
        kind: thread.kind,
        source: thread.source,
        error: result.error || null,
      }),
    },
  });

  if (!result.ok) {
    redirect(`/app/inbox/${threadId}?send=fail`);
  }
  redirect(`/app/inbox/${threadId}?send=ok${simulate ? "&sim=1" : ""}`);
}
