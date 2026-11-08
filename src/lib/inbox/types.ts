import type { ConversationKind, LeadSource } from "@prisma/client";

export type SandboxInboxSample = {
  externalThreadId: string;
  source: LeadSource;
  kind: ConversationKind;
  channelKind:
    | "META_INSTAGRAM"
    | "META_FACEBOOK"
    | "WHATSAPP_CLOUD"
    | "IMAP"
    | "WEB_FORM"
    | "MANUAL_QUEUE";
  contactName: string;
  contactHandle: string;
  subject: string;
  permalink?: string;
  messages: {
    direction: "IN" | "OUT";
    body: string;
    externalId: string;
    minutesAgo: number;
  }[];
};

/** Deterministic sandbox feed — no live Meta/TikTok/LinkedIn keys. */
export const SANDBOX_INBOX_SAMPLES: SandboxInboxSample[] = [
  {
    externalThreadId: "sandbox:ig-dm:sara_viaggi",
    source: "INSTAGRAM",
    kind: "DM",
    channelKind: "META_INSTAGRAM",
    contactName: "Sara Viaggi",
    contactHandle: "@sara_viaggi",
    subject: "DM Instagram · Zhangjiajie",
    permalink: "https://instagram.com/direct/sandbox",
    messages: [
      {
        direction: "IN",
        body: "Ciao! Info su Zhangjiajie e Chengdu per 6 persone a ottobre?",
        externalId: "sandbox:ig-dm:1",
        minutesAgo: 90,
      },
      {
        direction: "IN",
        body: "Possiamo anche fare 8 giorni se conviene.",
        externalId: "sandbox:ig-dm:2",
        minutesAgo: 85,
      },
    ],
  },
  {
    externalThreadId: "sandbox:ig-comment:post_cina_classic",
    source: "INSTAGRAM",
    kind: "COMMENT",
    channelKind: "META_INSTAGRAM",
    contactName: "marco.trek",
    contactHandle: "@marco.trek",
    subject: "Commento · post Cina Classic",
    permalink: "https://instagram.com/p/sandbox_cina",
    messages: [
      {
        direction: "IN",
        body: "Quanto costa circa a persona a settembre? 😍",
        externalId: "sandbox:ig-cmt:1",
        minutesAgo: 40,
      },
    ],
  },
  {
    externalThreadId: "sandbox:fb-dm:paolo_blu",
    source: "FACEBOOK",
    kind: "DM",
    channelKind: "META_FACEBOOK",
    contactName: "Paolo Blu",
    contactHandle: "fb:paolo.blu",
    subject: "Messenger · groupage Guilin",
    messages: [
      {
        direction: "IN",
        body: "Buongiorno, groupage 22 pax Guilin Yangshuo 8 giorni marzo 2027. Paolo Blu paolo.blu@example.com",
        externalId: "sandbox:fb-dm:1",
        minutesAgo: 200,
      },
    ],
  },
  {
    externalThreadId: "sandbox:fb-comment:ads_landing",
    source: "FACEBOOK",
    kind: "COMMENT",
    channelKind: "META_FACEBOOK",
    contactName: "Elena Rossi",
    contactHandle: "fb:elena.rossi",
    subject: "Commento ads · landing",
    permalink: "https://facebook.com/sandbox/posts/1",
    messages: [
      {
        direction: "IN",
        body: "Il form della landing funziona anche da mobile?",
        externalId: "sandbox:fb-cmt:1",
        minutesAgo: 25,
      },
    ],
  },
  {
    externalThreadId: "sandbox:wa:luca_neri",
    source: "WHATSAPP",
    kind: "DM",
    channelKind: "WHATSAPP_CLOUD",
    contactName: "Luca Neri",
    contactHandle: "+393331112233",
    subject: "WhatsApp · Pechino Shanghai",
    messages: [
      {
        direction: "IN",
        body: "Ciao, siamo in 2, vorremmo Pechino e Shanghai 10 giorni a maggio 2027. Budget 2200. Luca",
        externalId: "sandbox:wa:1",
        minutesAgo: 15,
      },
    ],
  },
  {
    externalThreadId: "sandbox:mail:anna_verdi",
    source: "EMAIL",
    kind: "EMAIL",
    channelKind: "IMAP",
    contactName: "Anna Verdi",
    contactHandle: "anna.verdi@example.com",
    subject: "Richiesta Cina Classic 12 giorni",
    messages: [
      {
        direction: "IN",
        body: "Buongiorno,\nrichiesta Cina Classic 12 giorni, 2 pax, settembre 2026, Pechino Xi'an Shanghai.\nGrazie,\nAnna Verdi",
        externalId: "sandbox:mail:1",
        minutesAgo: 300,
      },
    ],
  },
];

export function conversationKindLabel(kind: ConversationKind): string {
  switch (kind) {
    case "DM":
      return "DM";
    case "COMMENT":
      return "Commento";
    case "EMAIL":
      return "Email";
    case "WEB":
      return "Web";
    default:
      return kind;
  }
}
