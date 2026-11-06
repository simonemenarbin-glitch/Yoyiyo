import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createHash } from "crypto";
import { isNoiseMessage } from "./noise";

export type FetchedInbound = {
  externalId: string;
  fingerprint: string;
  fromName: string | null;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: Date | null;
  rawText: string;
  skipReason?: string;
};

function fingerprint(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40);
}

function sinceDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(1, days));
  return d;
}

export async function fetchImapMessages(input: {
  host: string;
  port?: number;
  username: string;
  password: string;
  mailbox?: string;
  lookbackDays?: number;
  limit?: number;
}): Promise<FetchedInbound[]> {
  const client = new ImapFlow({
    host: input.host,
    port: input.port || 993,
    secure: true,
    auth: { user: input.username, pass: input.password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  const out: FetchedInbound[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock(input.mailbox || "INBOX");
    try {
      const since = sinceDate(input.lookbackDays || 3);
      const lim = input.limit || 40;
      // Search recent UIDs
      const uids = await client.search({ since }, { uid: true });
      const slice = (uids || []).slice(-lim);

      for (const uid of slice) {
        const msg = await client.fetchOne(
          String(uid),
          { source: true, envelope: true, uid: true },
          { uid: true },
        );
        if (!msg || !msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const fromAddr =
          parsed.from?.value?.[0]?.address ||
          msg.envelope?.from?.[0]?.address ||
          null;
        const fromName =
          parsed.from?.value?.[0]?.name ||
          msg.envelope?.from?.[0]?.name ||
          null;
        const subject = parsed.subject || msg.envelope?.subject || null;
        const text =
          (parsed.text || "").trim() ||
          (typeof parsed.html === "string"
            ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
            : "");

        const rawText = [
          fromAddr || fromName ? `From: ${fromName || ""} <${fromAddr || ""}>` : null,
          subject ? `Subject: ${subject}` : null,
          "",
          text,
        ]
          .filter((x) => x !== null)
          .join("\n")
          .trim();

        const externalId = `${input.username}:uid:${msg.uid}`;
        const fp = fingerprint([
          input.username,
          String(msg.uid),
          fromAddr || "",
          subject || "",
          String(msg.envelope?.date?.getTime() || parsed.date?.getTime() || ""),
        ]);

        if (!rawText || rawText.length < 20) {
          out.push({
            externalId,
            fingerprint: fp,
            fromName,
            fromAddress: fromAddr,
            subject,
            receivedAt: parsed.date || msg.envelope?.date || null,
            rawText: rawText || subject || "(vuoto)",
            skipReason: "Messaggio troppo corto",
          });
          continue;
        }

        if (isNoiseMessage({ from: fromAddr, subject, text: rawText })) {
          out.push({
            externalId,
            fingerprint: fp,
            fromName,
            fromAddress: fromAddr,
            subject,
            receivedAt: parsed.date || msg.envelope?.date || null,
            rawText,
            skipReason: "Filtro rumore (newsletter/sistema)",
          });
          continue;
        }

        out.push({
          externalId,
          fingerprint: fp,
          fromName,
          fromAddress: fromAddr,
          subject,
          receivedAt: parsed.date || msg.envelope?.date || null,
          rawText,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }

  return out;
}
