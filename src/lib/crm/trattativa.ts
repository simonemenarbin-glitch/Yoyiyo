import type {
  ContractStatus,
  InboxThreadStatus,
  IntakeStatus,
  InvoiceStatus,
  PipelineStage,
  PracticeStatus,
  QuoteStatus,
} from "@prisma/client";
import { pipelineStageLabel } from "@/lib/labels";

/** Azione primaria mostrata in cima alla vista Trattativa (stile GHL next step). */
export type TrattativaNextAction = {
  code: string;
  title: string;
  detail: string;
  href?: string;
  ctaLabel?: string;
};

export type TrattativaTimelineKind =
  | "stage"
  | "message"
  | "thread"
  | "quote"
  | "practice"
  | "contract"
  | "invoice"
  | "note";

export type TrattativaTimelineItem = {
  id: string;
  at: Date;
  kind: TrattativaTimelineKind;
  title: string;
  detail?: string;
  href?: string;
  tone?: "neutral" | "in" | "out" | "success" | "warn";
};

export type StageHistoryItem = {
  at: Date;
  stage: PipelineStage;
  label: string;
  fromStage?: PipelineStage | null;
  source: "audit" | "synthetic";
};

export type NextActionInput = {
  leadId: string;
  pipelineStage: PipelineStage;
  intakeStatus: IntakeStatus;
  missingFields: string[];
  unreadCount: number;
  primaryThreadId?: string | null;
  quotes: Array<{ id: string; status: QuoteStatus; number: string }>;
  practices: Array<{ id: string; status: PracticeStatus; reference: string }>;
  contracts: Array<{
    id: string;
    practiceId: string;
    status: ContractStatus;
    signedAt?: Date | null;
  }>;
  invoicesAr: Array<{ id: string; status: InvoiceStatus; number: string }>;
};

export function computeNextAction(input: NextActionInput): TrattativaNextAction {
  const trattativaHref = `/app/crm/trattative/${input.leadId}`;

  if (input.pipelineStage === "LOST") {
    return {
      code: "LOST",
      title: "Trattativa persa",
      detail: "Nessuna azione commerciale attiva. Puoi riaprire spostando lo stage.",
      href: trattativaHref,
      ctaLabel: "Rivedi stage",
    };
  }

  if (input.pipelineStage === "WON") {
    const unpaid = input.invoicesAr.find((i) =>
      ["ISSUED", "SENT", "PARTIAL", "OVERDUE"].includes(i.status),
    );
    if (unpaid) {
      return {
        code: "COLLECT",
        title: "Sollecita o registra l’incasso",
        detail: `Fattura ${unpaid.number} ancora da chiudere.`,
        href: `/app/contabilita/${unpaid.id}`,
        ctaLabel: "Apri fattura",
      };
    }
    return {
      code: "WON",
      title: "Trattativa vinta",
      detail: "Pipeline chiusa. Controlla pratica e documenti se serve.",
      href: input.practices[0] ? `/app/pratiche/${input.practices[0].id}` : trattativaHref,
      ctaLabel: input.practices[0] ? "Apri pratica" : "Vedi trattativa",
    };
  }

  if (input.unreadCount > 0) {
    return {
      code: "UNREAD",
      title: "Rispondi ai messaggi non letti",
      detail:
        input.unreadCount === 1
          ? "C’è 1 messaggio da leggere nell’inbox collegata."
          : `Ci sono ${input.unreadCount} messaggi non letti nell’inbox collegata.`,
      href: input.primaryThreadId
        ? `/app/inbox/${input.primaryThreadId}`
        : "/app/inbox",
      ctaLabel: "Apri inbox",
    };
  }

  if (input.pipelineStage === "NEW") {
    return {
      code: "CONTACT",
      title: "Contatta il cliente",
      detail: "La trattativa è ancora in Nuovo: fai il primo contatto e sposta lo stage.",
      href: input.primaryThreadId
        ? `/app/inbox/${input.primaryThreadId}`
        : trattativaHref,
      ctaLabel: input.primaryThreadId ? "Apri conversazione" : "Aggiorna stage",
    };
  }

  if (
    input.intakeStatus === "NEEDS_INFO" ||
    (input.missingFields.length > 0 && input.quotes.length === 0)
  ) {
    return {
      code: "ASK_INFO",
      title: "Chiedi i dati mancanti",
      detail:
        input.missingFields.length > 0
          ? `Servono ancora: ${input.missingFields.slice(0, 4).join(", ")}.`
          : "Mancano informazioni per un preventivo base.",
      href: input.primaryThreadId
        ? `/app/inbox/${input.primaryThreadId}`
        : trattativaHref,
      ctaLabel: "Scrivi al cliente",
    };
  }

  if (input.quotes.length === 0) {
    return {
      code: "CREATE_QUOTE",
      title: "Crea il preventivo",
      detail: "Nessun preventivo collegato: genera un’ipotesi di lavoro da listino.",
      href: trattativaHref,
      ctaLabel: "Vai ai preventivi",
    };
  }

  const draft = input.quotes.find((q) => q.status === "DRAFT");
  if (draft) {
    return {
      code: "SEND_QUOTE",
      title: "Invia il preventivo",
      detail: `${draft.number} è ancora in bozza.`,
      href: `/app/preventivi/${draft.id}`,
      ctaLabel: "Apri preventivo",
    };
  }

  const pendingSign = input.contracts.find((c) =>
    ["DRAFT", "SENT", "VIEWED"].includes(c.status),
  );
  if (pendingSign) {
    return {
      code: "SIGN",
      title: "Segui la firma del contratto",
      detail:
        pendingSign.status === "DRAFT"
          ? "Contratto in bozza: invialo al firmatario."
          : "Contratto inviato: attendi o sollecita la firma.",
      href: `/app/pratiche/${pendingSign.practiceId}/contratti/${pendingSign.id}`,
      ctaLabel: "Apri contratto",
    };
  }

  const practice = input.practices[0];
  const accepted = input.quotes.find((q) => q.status === "ACCEPTED");
  if (accepted && !practice) {
    return {
      code: "OPEN_PRACTICE",
      title: "Apri la pratica",
      detail: `Preventivo ${accepted.number} accettato: crea la pratica operativa.`,
      href: `/app/preventivi/${accepted.id}`,
      ctaLabel: "Dal preventivo",
    };
  }

  if (practice && ["CONFIRMED", "IN_PROGRESS"].includes(practice.status)) {
    const hasSigned = input.contracts.some((c) => c.status === "SIGNED");
    const ar = input.invoicesAr[0];
    if (hasSigned && !ar) {
      return {
        code: "INVOICE",
        title: "Emetti la fattura cliente",
        detail: `Pratica ${practice.reference} confermata e contratto firmato.`,
        href: `/app/pratiche/${practice.id}`,
        ctaLabel: "Dalla pratica",
      };
    }
    if (ar && ["ISSUED", "SENT", "PARTIAL", "OVERDUE"].includes(ar.status)) {
      return {
        code: "COLLECT",
        title: "Incassa o aggiorna la fattura",
        detail: `Fattura ${ar.number} collegata alla pratica ${practice.reference}.`,
        href: `/app/contabilita/${ar.id}`,
        ctaLabel: "Apri fattura",
      };
    }
  }

  const sentQuote = input.quotes.find((q) => q.status === "SENT");
  if (sentQuote && ["CONTACTED", "QUALIFIED", "QUOTING", "NEGOTIATION"].includes(input.pipelineStage)) {
    return {
      code: "FOLLOW_UP",
      title: "Fai follow-up sul preventivo",
      detail: `${sentQuote.number} è stato inviato: richiama o scrivi per chiudere.`,
      href: `/app/preventivi/${sentQuote.id}`,
      ctaLabel: "Apri preventivo",
    };
  }

  if (input.pipelineStage === "NEGOTIATION") {
    return {
      code: "CLOSE",
      title: "Chiudi la trattativa",
      detail: "Sei in negoziazione: porta a Vinto o Perso con un esito chiaro.",
      href: trattativaHref,
      ctaLabel: "Aggiorna stage",
    };
  }

  return {
    code: "REVIEW",
    title: "Controlla la trattativa",
    detail: `Stage attuale: ${pipelineStageLabel[input.pipelineStage]}. Aggiorna stage, inbox o preventivo.`,
    href: trattativaHref,
    ctaLabel: "Resta qui",
  };
}

export function buildStageHistory(input: {
  createdAt: Date;
  currentStage: PipelineStage;
  audits: Array<{ action: string; createdAt: Date; metaJson?: string | null }>;
}): StageHistoryItem[] {
  const items: StageHistoryItem[] = [
    {
      at: input.createdAt,
      stage: "NEW",
      label: pipelineStageLabel.NEW,
      source: "synthetic",
    },
  ];

  for (const a of input.audits) {
    if (a.action !== "LEAD_STAGE_CHANGE") continue;
    let to: PipelineStage | null = null;
    let from: PipelineStage | null = null;
    try {
      const meta = a.metaJson ? (JSON.parse(a.metaJson) as { to?: string; from?: string }) : {};
      if (meta.to) to = meta.to as PipelineStage;
      if (meta.from) from = meta.from as PipelineStage;
    } catch {
      to = null;
    }
    if (!to) continue;
    items.push({
      at: a.createdAt,
      stage: to,
      label: pipelineStageLabel[to] || to,
      fromStage: from,
      source: "audit",
    });
  }

  const last = items[items.length - 1];
  if (last.stage !== input.currentStage) {
    items.push({
      at: new Date(),
      stage: input.currentStage,
      label: pipelineStageLabel[input.currentStage],
      fromStage: last.stage,
      source: "synthetic",
    });
  }

  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function buildTrattativaTimeline(input: {
  leadCreatedAt: Date;
  stageHistory: StageHistoryItem[];
  messages: Array<{
    id: string;
    createdAt: Date;
    sentAt?: Date | null;
    direction: "IN" | "OUT";
    subject?: string | null;
    body: string;
    status: string;
  }>;
  threads: Array<{
    id: string;
    lastAt?: Date | null;
    lastBody?: string | null;
    unreadCount: number;
    status: InboxThreadStatus;
    contactName?: string | null;
  }>;
  quotes: Array<{
    id: string;
    number: string;
    title: string;
    status: QuoteStatus;
    createdAt: Date;
    totalSell: number;
  }>;
  practices: Array<{
    id: string;
    reference: string;
    title: string;
    status: PracticeStatus;
    createdAt: Date;
    confirmedAt?: Date | null;
  }>;
  contracts: Array<{
    id: string;
    practiceId: string;
    title: string;
    status: ContractStatus;
    createdAt: Date;
    sentAt?: Date | null;
    signedAt?: Date | null;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    direction: "AR" | "AP";
    status: InvoiceStatus;
    createdAt: Date;
    paidAt?: Date | null;
    total: number;
  }>;
}): TrattativaTimelineItem[] {
  const items: TrattativaTimelineItem[] = [
    {
      id: "lead-created",
      at: input.leadCreatedAt,
      kind: "note",
      title: "Trattativa aperta",
      detail: "Lead creato in pipeline",
      tone: "neutral",
    },
  ];

  for (const s of input.stageHistory) {
    if (s.source === "synthetic" && s.stage === "NEW" && s.at.getTime() === input.leadCreatedAt.getTime()) {
      continue;
    }
    items.push({
      id: `stage-${s.stage}-${s.at.toISOString()}`,
      at: s.at,
      kind: "stage",
      title: `Stage → ${s.label}`,
      detail: s.fromStage
        ? `Da ${pipelineStageLabel[s.fromStage] || s.fromStage}`
        : undefined,
      tone: s.stage === "WON" ? "success" : s.stage === "LOST" ? "warn" : "neutral",
    });
  }

  for (const m of input.messages) {
    const snippet = m.body.replace(/\s+/g, " ").trim().slice(0, 120);
    items.push({
      id: `msg-${m.id}`,
      at: m.sentAt || m.createdAt,
      kind: "message",
      title: m.direction === "OUT" ? "Messaggio inviato" : "Messaggio ricevuto",
      detail: m.subject ? `${m.subject} — ${snippet}` : snippet,
      tone: m.direction === "OUT" ? "out" : "in",
    });
  }

  for (const t of input.threads) {
    if (!t.lastAt) continue;
    items.push({
      id: `thread-${t.id}`,
      at: t.lastAt,
      kind: "thread",
      title: t.unreadCount > 0 ? "Inbox · non letto" : "Inbox · ultimo aggiornamento",
      detail: t.lastBody?.replace(/\s+/g, " ").trim().slice(0, 120) || t.contactName || undefined,
      href: `/app/inbox/${t.id}`,
      tone: t.unreadCount > 0 ? "warn" : "neutral",
    });
  }

  for (const q of input.quotes) {
    items.push({
      id: `quote-${q.id}`,
      at: q.createdAt,
      kind: "quote",
      title: `Preventivo ${q.number}`,
      detail: `${q.title} · ${q.status}`,
      href: `/app/preventivi/${q.id}`,
      tone: q.status === "ACCEPTED" ? "success" : q.status === "REJECTED" ? "warn" : "neutral",
    });
  }

  for (const p of input.practices) {
    items.push({
      id: `practice-${p.id}`,
      at: p.createdAt,
      kind: "practice",
      title: `Pratica ${p.reference}`,
      detail: p.title,
      href: `/app/pratiche/${p.id}`,
      tone: "neutral",
    });
    if (p.confirmedAt) {
      items.push({
        id: `practice-confirmed-${p.id}`,
        at: p.confirmedAt,
        kind: "practice",
        title: `Pratica confermata · ${p.reference}`,
        href: `/app/pratiche/${p.id}`,
        tone: "success",
      });
    }
  }

  for (const c of input.contracts) {
    items.push({
      id: `contract-${c.id}`,
      at: c.createdAt,
      kind: "contract",
      title: `Contratto · ${c.title}`,
      detail: c.status,
      href: `/app/pratiche/${c.practiceId}/contratti/${c.id}`,
      tone: "neutral",
    });
    if (c.sentAt) {
      items.push({
        id: `contract-sent-${c.id}`,
        at: c.sentAt,
        kind: "contract",
        title: "Contratto inviato in firma",
        href: `/app/pratiche/${c.practiceId}/contratti/${c.id}`,
        tone: "out",
      });
    }
    if (c.signedAt) {
      items.push({
        id: `contract-signed-${c.id}`,
        at: c.signedAt,
        kind: "contract",
        title: "Contratto firmato",
        href: `/app/pratiche/${c.practiceId}/contratti/${c.id}`,
        tone: "success",
      });
    }
  }

  for (const inv of input.invoices) {
    items.push({
      id: `invoice-${inv.id}`,
      at: inv.createdAt,
      kind: "invoice",
      title: `Fattura ${inv.number}`,
      detail: `${inv.direction} · ${inv.status}`,
      href: `/app/contabilita/${inv.id}`,
      tone: inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "warn" : "neutral",
    });
    if (inv.paidAt) {
      items.push({
        id: `invoice-paid-${inv.id}`,
        at: inv.paidAt,
        kind: "invoice",
        title: `Incasso registrato · ${inv.number}`,
        href: `/app/contabilita/${inv.id}`,
        tone: "success",
      });
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
