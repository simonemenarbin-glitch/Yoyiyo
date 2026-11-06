import nodemailer from "nodemailer";
import type { ChannelConnection, Lead, LeadSource } from "@prisma/client";
import { loadLocalMailPassword } from "./mail-password";

export type SendResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
  simulated?: boolean;
};

function smtpHostFromImap(host?: string | null) {
  if (!host) return "smtp.hostinger.com";
  if (host.startsWith("imap.")) return host.replace(/^imap\./, "smtp.");
  return "smtp.hostinger.com";
}

export async function sendViaEmail(input: {
  connection: ChannelConnection;
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<SendResult> {
  const user = input.connection.username;
  const pass = input.connection.secret || loadLocalMailPassword();
  if (!user || !pass) {
    return { ok: false, error: "Credenziali SMTP/IMAP mancanti sul canale" };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHostFromImap(input.connection.host),
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${input.fromName || "Ufficio Booking / Yoyiyo"}" <${user}>`,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });
    return { ok: true, providerId: info.messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** WhatsApp Cloud / Meta: invio reale se token presente, altrimenti errore chiaro. */
export async function sendViaMetaApi(input: {
  connection: ChannelConnection;
  to: string;
  body: string;
}): Promise<SendResult> {
  let cfg: {
    token?: string;
    phoneNumberId?: string;
    pageId?: string;
  } = {};
  try {
    cfg = input.connection.configJson ? JSON.parse(input.connection.configJson) : {};
  } catch {
    cfg = {};
  }

  if (!cfg.token) {
    return {
      ok: false,
      error: "Token API non configurato: salvalo nella maschera canale oppure usa «Simula invio».",
    };
  }

  if (input.connection.kind === "WHATSAPP_CLOUD") {
    if (!cfg.phoneNumberId) {
      return { ok: false, error: "Manca Phone number ID WhatsApp" };
    }
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${cfg.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to.replace(/\D/g, ""),
          type: "text",
          text: { body: input.body },
        }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: data.error?.message || `WhatsApp HTTP ${res.status}` };
    }
    return { ok: true, providerId: data.messages?.[0]?.id };
  }

  // Instagram / Facebook Messenger: require page-scoped recipient id in `to`
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.to },
      message: { text: input.body },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    message_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message || `Meta HTTP ${res.status}` };
  }
  return { ok: true, providerId: data.message_id };
}

export async function sendOutboundMessage(input: {
  connection: ChannelConnection | null;
  lead: Lead;
  to: string;
  subject: string;
  body: string;
  simulate?: boolean;
}): Promise<SendResult> {
  if (input.simulate) {
    return {
      ok: true,
      simulated: true,
      providerId: `sim-${Date.now()}`,
    };
  }
  if (!input.connection) {
    return { ok: false, error: "Nessun canale di invio selezionato" };
  }

  if (input.connection.kind === "IMAP" || input.lead.source === "EMAIL") {
    return sendViaEmail({
      connection: input.connection,
      to: input.to,
      subject: input.subject,
      body: input.body,
    });
  }

  if (
    input.connection.kind === "WHATSAPP_CLOUD" ||
    input.connection.kind === "META_INSTAGRAM" ||
    input.connection.kind === "META_FACEBOOK"
  ) {
    return sendViaMetaApi({
      connection: input.connection,
      to: input.to,
      body: input.body,
    });
  }

  if (input.connection.kind === "WEB_FORM") {
    return {
      ok: false,
      error: "Il form web non ha un canale di risposta diretto: usa EMAIL o WhatsApp del lead.",
    };
  }

  return { ok: false, error: `Invio non supportato per ${input.connection.kind}` };
}

export function defaultReplySubject(lead: Lead, source: LeadSource) {
  if (source === "EMAIL") {
    const detail = lead.sourceDetail || "";
    const m = detail.match(/·\s*(.+)$/);
    const original = m?.[1]?.trim();
    if (original && !/^re:/i.test(original)) return `Re: ${original}`;
    if (original) return original;
    return `Re: richiesta viaggio — ${lead.firstName} ${lead.lastName}`;
  }
  return `Risposta Yoyiyo — ${lead.firstName} ${lead.lastName}`;
}

export function pickReplyAddress(lead: Lead): string | null {
  if (lead.source === "EMAIL" || lead.source === "WEB") return lead.email || null;
  if (lead.source === "WHATSAPP" || lead.source === "PHONE") return lead.phone || null;
  // IG/FB often store handle in phone/email/sourceDetail
  return lead.email || lead.phone || null;
}
