import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTrattativa } from "@/lib/crm/load-trattativa";
import { StatusPill } from "@/components/StatusPill";
import {
  PageHeader,
  SectionCard,
  SoftDetails,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";
import { createQuoteFromLead, updateLeadStage } from "@/lib/actions/crm";
import {
  generateBaseQuoteFromLead,
  refineDraftReplyAi,
  reprocessLeadIntake,
  saveDraftReply,
} from "@/lib/actions/intake";
import { sendLeadReply } from "@/lib/actions/send";
import { defaultReplySubject, pickReplyAddress } from "@/lib/channels/send-outbound";
import { eur, shortDate } from "@/lib/format";
import {
  clientTypeLabel,
  intakeStatusLabel,
  leadSourceLabel,
  missingFieldLabel,
  pipelineStageLabel,
  pipelineStagesOrdered,
  practiceStatusLabel,
  quoteStatusLabel,
} from "@/lib/labels";
import { contractStatusLabel } from "@/lib/practices/contract";
import {
  invoiceDirectionLabel,
  invoiceStatusLabel,
} from "@/lib/accounting/invoices";
import type { MissingFieldKey } from "@/lib/intake/types";

function timelineToneClass(tone?: string) {
  switch (tone) {
    case "in":
      return "border-sky-200 bg-sky-50/70";
    case "out":
      return "border-teal-800/20 bg-teal-50/60";
    case "success":
      return "border-emerald-200 bg-emerald-50/70";
    case "warn":
      return "border-amber-200 bg-amber-50/70";
    default:
      return "border-slate-200 bg-white";
  }
}

export default async function Trattativa360Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;
  const sp = await searchParams;

  const data = await loadTrattativa(prisma, membership.organizationId, id);
  if (!data) notFound();

  const {
    lead,
    practices,
    invoices,
    stageHistory,
    nextAction,
    timeline,
    unreadCount,
    primaryThread,
    missing,
    siblingLeads,
  } = data;

  const channels = await prisma.channelConnection.findMany({
    where: { organizationId: membership.organizationId, enabled: true },
    orderBy: { label: "asc" },
  });

  const destinations = lead.destinationsJson
    ? (JSON.parse(lead.destinationsJson) as string[])
    : [];
  const ready = lead.intakeStatus === "READY_TO_QUOTE" || lead.intakeStatus === "QUOTED";
  const defaultTo = pickReplyAddress(lead) || "";
  const defaultSubject = defaultReplySubject(lead, lead.source);
  const title =
    lead.pipelineName || lead.interest || `${lead.lastName} ${lead.firstName}`;

  const sendFlash =
    sp.send === "ok"
      ? sp.sim
        ? "Risposta registrata (simulata)."
        : "Risposta inviata e tracciata."
      : sp.send === "fail"
        ? "Invio fallito — vedi timeline per il dettaglio."
        : sp.send === "need_confirm"
          ? "Spunta «Confermo invio» per mandare."
          : sp.send === "no_address"
            ? "Manca indirizzo/telefono di risposta."
            : sp.send === "no_channel"
              ? "Nessun canale attivo per questo lead."
              : sp.send === "empty"
                ? "Il testo della risposta è vuoto."
                : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Trattativa"
        backHref="/app/crm"
        backLabel="Pipeline"
        title={title}
        description={`${lead.lastName} ${lead.firstName} · ${leadSourceLabel[lead.source]}${
          lead.customer ? ` · Cliente anagrafica` : ""
        }`}
        actions={
          <>
            {lead.customer ? (
              <Link href={`/app/clienti/${lead.customer.id}`} className={btnSecondary}>
                Cliente
              </Link>
            ) : null}
            {primaryThread ? (
              <Link href={`/app/inbox/${primaryThread.id}`} className={btnSecondary}>
                Inbox{unreadCount ? ` (${unreadCount})` : ""}
              </Link>
            ) : (
              <Link href="/app/inbox" className={btnSecondary}>
                Inbox
              </Link>
            )}
            <Link href={`/app/crm/trattative/${lead.id}#prossimo-passo`} className={btnPrimary}>
              Prossimo passo
            </Link>
          </>
        }
      />

      {sendFlash ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            sp.send === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {sendFlash}
        </div>
      ) : null}

      {/* Prossimo passo — GHL-style next action */}
      <section
        id="prossimo-passo"
        className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#0F3D3E]/15 bg-gradient-to-br from-[#0F3D3E] to-[#1a5c5e] p-5 text-white shadow-[0_12px_32px_rgba(15,61,62,0.18)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/80">
          Prossimo passo
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{nextAction.title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-teal-50/90">
          {nextAction.detail}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextAction.href && nextAction.ctaLabel ? (
            <Link
              href={nextAction.href}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0F3D3E]"
            >
              {nextAction.ctaLabel}
            </Link>
          ) : null}
          <form action={updateLeadStage} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-xs text-teal-100/90">
              Stage
              <select
                name="pipelineStage"
                defaultValue={lead.pipelineStage}
                className="mt-1 block min-h-11 rounded-xl border-0 bg-white/95 px-3 text-sm text-[#0F3D3E]"
              >
                {pipelineStagesOrdered.map((s) => (
                  <option key={s} value={s}>
                    {pipelineStageLabel[s]}
                  </option>
                ))}
              </select>
            </label>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
              Aggiorna stage
            </button>
          </form>
        </div>
      </section>

      {/* Stage corrente + storico */}
      <SectionCard
        title="Stage pipeline"
        hint={`Corrente: ${pipelineStageLabel[lead.pipelineStage]} · Intake: ${intakeStatusLabel[lead.intakeStatus]}`}
      >
        <div className="rotta-scroll-x flex gap-2 pb-1">
          {pipelineStagesOrdered.map((stage) => {
            const current = lead.pipelineStage === stage;
            const seen = stageHistory.some((h) => h.stage === stage);
            return (
              <div
                key={stage}
                className={`min-w-[7.5rem] rounded-xl border px-3 py-2 text-center text-xs ${
                  current
                    ? "border-[#0F3D3E] bg-[#0F3D3E] text-white"
                    : seen
                      ? "border-teal-800/20 bg-teal-50 text-[#0F3D3E]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {pipelineStageLabel[stage]}
              </div>
            );
          })}
        </div>
        <ol className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {[...stageHistory].reverse().map((h, i) => (
            <li key={`${h.stage}-${h.at.toISOString()}-${i}`} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 text-xs text-slate-500">{shortDate(h.at)}</span>
              <span className="font-medium text-[#0F3D3E]">{h.label}</span>
              {h.fromStage ? (
                <span className="text-xs text-slate-500">
                  da {pipelineStageLabel[h.fromStage]}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SectionCard title="Cliente">
            <div className="flex flex-wrap gap-2 text-sm">
              <StatusPill>{clientTypeLabel[lead.clientType]}</StatusPill>
              {lead.brand ? <StatusPill>{lead.brand.name}</StatusPill> : null}
              {lead.partner ? <StatusPill>B2B · {lead.partner.name}</StatusPill> : null}
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Nome</dt>
                <dd className="font-medium text-[#0F3D3E]">
                  {lead.lastName} {lead.firstName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Contatti</dt>
                <dd>
                  {lead.email || "—"}
                  <div className="text-slate-500">{lead.phone || "—"}</div>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Interesse</dt>
                <dd className="font-medium">{lead.interest || "—"}</dd>
                <div className="mt-1 flex flex-wrap gap-1">
                  {destinations.map((d) => (
                    <StatusPill key={d}>{d}</StatusPill>
                  ))}
                  {lead.departureHint ? <StatusPill>{lead.departureHint}</StatusPill> : null}
                  {lead.durationDays ? <StatusPill>{lead.durationDays} gg</StatusPill> : null}
                  <StatusPill>{lead.paxCount} pax</StatusPill>
                </div>
              </div>
            </dl>
            {siblingLeads.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Altre trattative dello stesso cliente
                </div>
                <ul className="mt-2 space-y-1">
                  {siblingLeads.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/app/crm/trattative/${s.id}`}
                        className="text-sm text-teal-800 underline"
                      >
                        {s.pipelineName || s.interest || "Trattativa"}{" "}
                        <span className="text-slate-500 no-underline">
                          ({pipelineStageLabel[s.pipelineStage]})
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Inbox collegata"
            hint={
              unreadCount
                ? `${unreadCount} non letti`
                : lead.inboxThreads.length
                  ? "Nessun non letto"
                  : "Nessun thread ancora"
            }
            action={
              primaryThread ? (
                <Link href={`/app/inbox/${primaryThread.id}`} className="text-sm text-teal-800 underline">
                  Apri
                </Link>
              ) : null
            }
          >
            {lead.inboxThreads.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessuna conversazione collegata. I thread inbox con questo lead compaiono qui.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lead.inboxThreads.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/inbox/${t.id}`}
                      className="flex items-start justify-between gap-3 py-3 hover:bg-teal-50/40"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#0F3D3E]">
                            {t.contactName || t.contactHandle || "Thread"}
                          </span>
                          <StatusPill>{leadSourceLabel[t.source]}</StatusPill>
                          {t.unreadCount > 0 ? (
                            <StatusPill>{t.unreadCount} non letti</StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                          {t.lastBody || t.subject || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {shortDate(t.lastAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Preventivi"
            action={
              <div className="flex flex-wrap gap-2">
                <form action={generateBaseQuoteFromLead}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button className="text-sm text-teal-800 underline" type="submit">
                    Base auto
                  </button>
                </form>
                <form action={createQuoteFromLead}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button className="text-sm text-teal-800 underline" type="submit">
                    Nuovo
                  </button>
                </form>
              </div>
            }
          >
            {lead.quotes.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessun preventivo.{" "}
                {ready
                  ? "Puoi generare un’ipotesi da listino."
                  : "Completa i dati o forza comunque un editor vuoto."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lead.quotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/app/preventivi/${q.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-teal-50/40"
                    >
                      <div>
                        <div className="font-medium text-[#0F3D3E]">{q.number}</div>
                        <div className="text-xs text-slate-500">{q.title}</div>
                      </div>
                      <div className="text-right">
                        <StatusPill>{quoteStatusLabel[q.status]}</StatusPill>
                        <div className="mt-1 text-sm font-medium">{eur(q.totalSell)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Pratiche e contratti">
            {practices.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessuna pratica collegata (via preventivo o stesso cliente).
              </p>
            ) : (
              <ul className="space-y-3">
                {practices.map((p) => (
                  <li key={p.id} className="rounded-xl border border-slate-100 px-3 py-3">
                    <Link href={`/app/pratiche/${p.id}`} className="font-medium text-[#0F3D3E] hover:underline">
                      {p.reference} · {p.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <StatusPill>{practiceStatusLabel[p.status]}</StatusPill>
                      <span className="text-slate-500">{eur(p.totalSell)}</span>
                    </div>
                    {p.contracts.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                        {p.contracts.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/app/pratiche/${p.id}/contratti/${c.id}`}
                              className="text-sm text-teal-800 underline"
                            >
                              Contratto · {contractStatusLabel[c.status]}
                              {c.signedAt ? ` · firmato ${shortDate(c.signedAt)}` : ""}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">Nessun contratto ancora.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Fatture">
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-500">Nessuna fattura collegata a pratica/preventivo.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/app/contabilita/${inv.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-teal-50/40"
                    >
                      <div>
                        <div className="font-medium text-[#0F3D3E]">{inv.number}</div>
                        <div className="text-xs text-slate-500">
                          {invoiceDirectionLabel[inv.direction]} · {inv.counterpartyName}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusPill>{invoiceStatusLabel[inv.status]}</StatusPill>
                        <div className="mt-1 text-sm font-medium">{eur(inv.total)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Timeline"
            hint="Messaggi, stage, preventivi, contratti e fatture in un’unica cronologia"
          >
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">Ancora nessun evento.</p>
            ) : (
              <ol className="space-y-2">
                {timeline.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${timelineToneClass(item.tone)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[#0F3D3E]">
                        {item.href ? (
                          <Link href={item.href} className="hover:underline">
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500">{shortDate(item.at)}</span>
                    </div>
                    {item.detail ? (
                      <p className="mt-1 line-clamp-3 text-xs text-slate-600">{item.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {missing.length > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <h2 className="font-semibold text-amber-950">Dati mancanti</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                {missing.map((m) => (
                  <li key={m}>
                    {missingFieldLabel[m as MissingFieldKey] || m}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <SoftDetails summary="Strumenti risposta e intake (canale)">
        {lead.rawSourceText ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sorgente grezza
            </div>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              {lead.rawSourceText}
            </pre>
            <form action={reprocessLeadIntake} className="mt-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <button className="text-sm text-teal-800 underline">Rielabora intake</button>
            </form>
          </div>
        ) : null}

        <form className="space-y-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Destinatario</span>
              <input
                name="toAddress"
                defaultValue={defaultTo}
                required
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Canale di invio</span>
              <select name="connectionId" className={fieldClass}>
                <option value="">Auto ({leadSourceLabel[lead.source]})</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · {c.kind}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Oggetto (email)</span>
            <input name="subject" defaultValue={defaultSubject} className={fieldClass} />
          </label>
          <textarea
            name="draftReply"
            rows={8}
            defaultValue={
              lead.draftReply ||
              `Buongiorno ${lead.firstName},\n\ngrazie per la richiesta.\n\nUfficio Booking / Yoyiyo`
            }
            className={fieldClass}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="confirmSend" value="1" />
            Confermo invio reale sul canale scelto
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input type="checkbox" name="simulate" value="1" />
            Solo simula (traccia in timeline senza provider)
          </label>
          <div className="flex flex-wrap gap-2">
            <button formAction={saveDraftReply} className={btnSecondary}>
              Salva bozza
            </button>
            <button formAction={refineDraftReplyAi} className={btnSecondary}>
              Rivedi con AI
            </button>
            <button formAction={sendLeadReply} className={btnPrimary}>
              Invia risposta
            </button>
          </div>
        </form>
      </SoftDetails>
    </div>
  );
}
