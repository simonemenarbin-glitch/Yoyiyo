"use server";

import { redirect } from "next/navigation";
import type { ChannelKind, LeadSource } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultImapAccounts, loadLocalMailPassword } from "@/lib/channels/mail-password";
import { syncOrganizationChannels } from "@/lib/channels/sync-all";

function asSource(kind: ChannelKind): LeadSource {
  switch (kind) {
    case "IMAP":
      return "EMAIL";
    case "WHATSAPP_CLOUD":
      return "WHATSAPP";
    case "META_INSTAGRAM":
      return "INSTAGRAM";
    case "META_FACEBOOK":
      return "FACEBOOK";
    case "WEB_FORM":
      return "WEB";
    default:
      return "OTHER";
  }
}

export async function saveChannelConnection(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const id = String(formData.get("id") || "");
  const kind = String(formData.get("kind") || "IMAP") as ChannelKind;
  const label = String(formData.get("label") || "").trim();
  const enabled = formData.get("enabled") === "1";
  const host = String(formData.get("host") || "") || null;
  const port = formData.get("port") ? Number(formData.get("port")) : null;
  const username = String(formData.get("username") || "") || null;
  const secretRaw = String(formData.get("secret") || "");
  const mailbox = String(formData.get("mailbox") || "INBOX") || "INBOX";
  const lookbackDays = Number(formData.get("lookbackDays") || 3);
  const token = String(formData.get("token") || "");
  const phoneNumberId = String(formData.get("phoneNumberId") || "");
  const pageId = String(formData.get("pageId") || "");
  const verifyToken = String(formData.get("verifyToken") || "");

  const configPatch: Record<string, unknown> = {};
  if (token) configPatch.token = token;
  if (phoneNumberId) configPatch.phoneNumberId = phoneNumberId;
  if (pageId) configPatch.pageId = pageId;
  if (verifyToken) configPatch.verifyToken = verifyToken;

  const data = {
    label: label || `${kind} ${username || pageId || "canale"}`,
    source: asSource(kind),
    kind,
    enabled,
    host: kind === "IMAP" ? host || "imap.hostinger.com" : host,
    port: kind === "IMAP" ? port || 993 : port,
    username,
    mailbox: kind === "IMAP" ? mailbox : null,
    lookbackDays: kind === "IMAP" ? lookbackDays : 3,
  };

  if (id) {
    const existing = await prisma.channelConnection.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) redirect("/app/crm/canali");
    let mergedConfig = existing.configJson;
    if (Object.keys(configPatch).length) {
      let prev: Record<string, unknown> = {};
      try {
        prev = existing.configJson ? JSON.parse(existing.configJson) : {};
      } catch {
        prev = {};
      }
      mergedConfig = JSON.stringify({ ...prev, ...configPatch });
    }
    await prisma.channelConnection.update({
      where: { id },
      data: {
        ...data,
        secret: secretRaw ? secretRaw : existing.secret,
        configJson: mergedConfig,
      },
    });
  } else {
    await prisma.channelConnection.create({
      data: {
        organizationId: orgId,
        ...data,
        secret: secretRaw || null,
        configJson: Object.keys(configPatch).length
          ? JSON.stringify({ pending: [], ...configPatch })
          : JSON.stringify({ pending: [] }),
      },
    });
  }

  redirect("/app/crm/canali");
}

export async function deleteChannelConnection(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  await prisma.channelConnection.deleteMany({
    where: { id, organizationId: membership.organizationId },
  });
  redirect("/app/crm/canali");
}

export async function bootstrapDefaultImapChannels() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const password = loadLocalMailPassword();

  for (const acc of defaultImapAccounts()) {
    const existing = await prisma.channelConnection.findFirst({
      where: { organizationId: orgId, label: acc.label },
    });
    if (existing) {
      if (password && !existing.secret) {
        await prisma.channelConnection.update({
          where: { id: existing.id },
          data: { secret: password, enabled: true },
        });
      }
      continue;
    }
    await prisma.channelConnection.create({
      data: {
        organizationId: orgId,
        label: acc.label,
        source: "EMAIL",
        kind: "IMAP",
        enabled: Boolean(password),
        host: "imap.hostinger.com",
        port: 993,
        username: acc.username,
        secret: password,
        mailbox: "INBOX",
        lookbackDays: 3,
      },
    });
  }

  // Placeholder other channels
  const placeholders: { label: string; kind: ChannelKind; source: LeadSource }[] = [
    { label: "WhatsApp Business", kind: "WHATSAPP_CLOUD", source: "WHATSAPP" },
    { label: "Instagram DM", kind: "META_INSTAGRAM", source: "INSTAGRAM" },
    { label: "Facebook Page", kind: "META_FACEBOOK", source: "FACEBOOK" },
    { label: "Form sito / landing", kind: "WEB_FORM", source: "WEB" },
  ];
  for (const p of placeholders) {
    const exists = await prisma.channelConnection.findFirst({
      where: { organizationId: orgId, label: p.label },
    });
    if (exists) continue;
    await prisma.channelConnection.create({
      data: {
        organizationId: orgId,
        label: p.label,
        source: p.source,
        kind: p.kind,
        enabled: false,
        configJson: JSON.stringify({ pending: [] }),
      },
    });
  }

  redirect("/app/crm/canali");
}

export async function enqueueDemoMessages(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const connectionId = String(formData.get("connectionId") || "");

  const conn = await prisma.channelConnection.findFirst({
    where: { id: connectionId, organizationId: orgId },
  });
  if (!conn) redirect("/app/crm/canali");

  const samples: Record<string, { fromName: string; fromAddress: string; subject: string; text: string }> = {
    WHATSAPP: {
      fromName: "Luca Neri",
      fromAddress: "+393331112233",
      subject: "WhatsApp inbound",
      text: "Ciao, siamo in 2, vorremmo Pechino e Shanghai 10 giorni a maggio 2027. Budget 2200. Luca",
    },
    INSTAGRAM: {
      fromName: "sara_viaggi",
      fromAddress: "@sara_viaggi",
      subject: "DM Instagram",
      text: "Hola! Info su Zhangjiajie e Chengdu per 6 persone a ottobre?",
    },
    FACEBOOK: {
      fromName: "Paolo Blu",
      fromAddress: "fb:paolo.blu",
      subject: "Messenger",
      text: "Buongiorno, groupage 22 pax Guilin Yangshuo 8 giorni marzo 2027, Paolo Blu paolo.blu@example.com",
    },
    WEB: {
      fromName: "Anna Verdi",
      fromAddress: "anna.verdi@example.com",
      subject: "Form preventivo sito",
      text: "From: Anna Verdi <anna.verdi@example.com>\nSubject: Form preventivo\n\nRichiesta Cina Classic 12 giorni, 2 pax, settembre 2026, Pechino Xi'an Shanghai.",
    },
    EMAIL: {
      fromName: "Demo",
      fromAddress: "demo@example.com",
      subject: "Demo",
      text: "Mail demo incompleta",
    },
  };

  const sample = samples[conn.source] || samples.WEB;
  let cfg: { pending?: unknown[] } = {};
  try {
    cfg = conn.configJson ? JSON.parse(conn.configJson) : {};
  } catch {
    cfg = {};
  }
  cfg.pending = [...(cfg.pending || []), { ...sample, externalId: `demo-${Date.now()}` }];

  await prisma.channelConnection.update({
    where: { id: conn.id },
    data: {
      enabled: true,
      configJson: JSON.stringify(cfg),
      lastError: null,
    },
  });

  redirect("/app/crm/canali");
}

export async function refreshAllChannels() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const results = await syncOrganizationChannels({
    organizationId: membership.organizationId,
    userId: user.id,
    autoQuote: true,
  });

  const summary = {
    leads: results.reduce((s, r) => s + r.createdLeads, 0),
    quotes: results.reduce((s, r) => s + r.quotes, 0),
    drafts: results.reduce((s, r) => s + r.drafts, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
    errors: results.flatMap((r) => r.errors.map((e) => `${r.label}: ${e}`)),
  };

  // Persist last summary in audit already done; redirect with query for UI flash
  const q = new URLSearchParams({
    leads: String(summary.leads),
    quotes: String(summary.quotes),
    drafts: String(summary.drafts),
    skipped: String(summary.skipped),
    err: String(summary.errors.length),
  });
  redirect(`/app/crm/canali?${q.toString()}`);
}
