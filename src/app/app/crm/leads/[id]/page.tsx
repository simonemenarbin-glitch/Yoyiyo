import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
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
  intakeStatusLabel,
  leadSourceLabel,
  missingFieldLabel,
  pipelineStageLabel,
  pipelineStagesOrdered,
  quoteStatusLabel,
} from "@/lib/labels";
import type { MissingFieldKey } from "@/lib/intake/types";

export default async function LeadDetailPage({
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

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      assignee: true,
      quotes: { orderBy: { updatedAt: "desc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { connection: true, user: true },
      },
    },
  });

  if (!lead) notFound();

  const channels = await prisma.channelConnection.findMany({
    where: { organizationId: membership.organizationId, enabled: true },
    orderBy: { label: "asc" },
  });

  const destinations = lead.destinationsJson
    ? (JSON.parse(lead.destinationsJson) as string[])
    : [];
  const missing = lead.missingFieldsJson
    ? (JSON.parse(lead.missingFieldsJson) as MissingFieldKey[])
    : [];
  const ready = lead.intakeStatus === "READY_TO_QUOTE" || lead.intakeStatus === "QUOTED";
  const defaultTo = pickReplyAddress(lead) || "";
  const defaultSubject = defaultReplySubject(lead, lead.source);

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
    <div className="space-y-6">
      <div>
        <Link href="/app/crm" className="text-sm text-teal-800/70">
          ← Pipeline
        </Link>
        <h1
          className="mt-2 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {lead.lastName} {lead.firstName}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
          <StatusPill>{pipelineStageLabel[lead.pipelineStage]}</StatusPill>
          <StatusPill>{intakeStatusLabel[lead.intakeStatus]}</StatusPill>
          <span>{leadSourceLabel[lead.source]}</span>
          {lead.sourceDetail ? <span>· {lead.sourceDetail}</span> : null}
          <span>· {lead.paxCount} pax</span>
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Contatti</div>
          <div className="mt-2 space-y-1 text-sm">
            <div>{lead.email || "—"}</div>
            <div>{lead.phone || "—"}</div>
            <div className="text-slate-500">{lead.brand?.name || "Brand non assegnato"}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4 md:col-span-2">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Interesse estratto</div>
          <div className="mt-2 text-sm font-medium">{lead.interest || "—"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            {destinations.map((d) => (
              <StatusPill key={d}>{d}</StatusPill>
            ))}
            {lead.departureHint ? <StatusPill>{lead.departureHint}</StatusPill> : null}
            {lead.durationDays ? <StatusPill>{lead.durationDays} giorni</StatusPill> : null}
          </div>
          {lead.budgetHint != null ? (
            <div className="mt-1 text-sm text-slate-600">Budget hint: {eur(lead.budgetHint)}</div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">Nessun budget dichiarato</div>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Timeline conversazione</h2>
        <p className="mt-1 text-xs text-slate-500">
          Ingressi da sync/incolla e uscite inviate dalla piattaforma — tutto tracciato.
        </p>
        {lead.messages.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Ancora nessun messaggio in timeline.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {lead.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  m.direction === "OUT"
                    ? "border-teal-800/20 bg-teal-50/50"
                    : "border-slate-200 bg-slate-50/80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <StatusPill>{m.direction === "OUT" ? "Inviato" : "Ricevuto"}</StatusPill>
                    <StatusPill>{m.status}</StatusPill>
                    <span className="text-slate-500">{leadSourceLabel[m.source]}</span>
                    {m.connection ? <span className="text-slate-500">· {m.connection.label}</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {shortDate(m.sentAt || m.createdAt)}
                    {m.user ? ` · ${m.user.name}` : ""}
                  </div>
                </div>
                {m.subject ? <div className="mt-1 font-medium text-[#0F3D3E]">{m.subject}</div> : null}
                <div className="mt-1 text-xs text-slate-500">
                  {m.direction === "OUT" ? `A: ${m.toAddress || "—"}` : `Da: ${m.fromAddress || "—"}`}
                </div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                  {m.body}
                </pre>
                {m.errorText ? (
                  <div className="mt-2 text-xs text-amber-800">{m.errorText}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {lead.rawSourceText ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Sorgente grezza</h2>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            {lead.rawSourceText}
          </pre>
          <form action={reprocessLeadIntake} className="mt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="text-sm text-teal-800 underline">Rielabora intake</button>
          </form>
        </section>
      ) : null}

      {missing.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <h2 className="font-semibold text-amber-950">Dati mancanti per preventivo base</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
            {missing.map((m) => (
              <li key={m}>{missingFieldLabel[m] || m}</li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-950">
          Dati sufficienti per un preventivo base da listino / API fornitori.
        </section>
      )}

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Rispondi dal canale</h2>
        <p className="mt-1 text-sm text-slate-600">
          Modifica la bozza, conferma e invia. L’invio parte dal canale collegato (SMTP IMAP /
          WhatsApp / Meta) e resta in timeline.
        </p>
        <form className="mt-3 space-y-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Destinatario</span>
              <input
                name="toAddress"
                defaultValue={defaultTo}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Canale di invio</span>
              <select name="connectionId" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
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
            <input
              name="subject"
              defaultValue={defaultSubject}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <textarea
            name="draftReply"
            rows={12}
            defaultValue={
              lead.draftReply ||
              `Buongiorno ${lead.firstName},\n\ngrazie per la richiesta.\n\nUfficio Booking / Yoyiyo`
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed"
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
            <button
              formAction={saveDraftReply}
              className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
            >
              Salva bozza
            </button>
            <button
              formAction={refineDraftReplyAi}
              className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
            >
              Rivedi con AI
            </button>
            <button
              formAction={sendLeadReply}
              className="rounded-xl bg-[#B33A2B] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Invia risposta
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Sposta in pipeline</h2>
          <form action={updateLeadStage} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block flex-1 text-sm">
              <span className="mb-1 block text-slate-600">Stadio</span>
              <select
                name="pipelineStage"
                defaultValue={lead.pipelineStage}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              >
                {pipelineStagesOrdered.map((s) => (
                  <option key={s} value={s}>
                    {pipelineStageLabel[s]}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Aggiorna
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Preventivo</h2>
          <p className="mt-1 text-sm text-slate-600">
            {ready
              ? "Genera (o rigenera) un preventivo base da listino proprio + slot API."
              : "Puoi forzare comunque un preventivo vuoto/lavorabile, oppure aspettare i dati mancanti."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={generateBaseQuoteFromLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button className="rounded-xl bg-[#B33A2B] px-4 py-2.5 text-sm font-medium text-white">
                Preventivo base automatico
              </button>
            </form>
            <form action={createQuoteFromLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]">
                Editor vuoto da lead
              </button>
            </form>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F3D3E]">
          Preventivi collegati
        </div>
        {lead.quotes.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">Nessun preventivo ancora.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lead.quotes.map((q) => (
              <Link
                key={q.id}
                href={`/app/preventivi/${q.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-teal-50/40"
              >
                <div>
                  <div className="font-medium text-[#0F3D3E]">{q.number}</div>
                  <div className="text-sm text-slate-500">
                    {q.title} · valido {shortDate(q.validUntil)}
                  </div>
                </div>
                <div className="text-right">
                  <StatusPill>{quoteStatusLabel[q.status]}</StatusPill>
                  <div className="mt-1 text-sm font-medium">{eur(q.totalSell)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
