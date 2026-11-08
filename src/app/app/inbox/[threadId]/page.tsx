import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  markThreadRead,
  replyInboxThread,
  runInboxCommercialAi,
  setThreadStatus,
} from "@/lib/actions/inbox";
import { conversationKindLabel } from "@/lib/inbox/types";
import { shortDate } from "@/lib/format";
import { leadSourceLabel, pipelineStageLabel } from "@/lib/labels";
import {
  FlashOk,
  PageHeader,
  SectionCard,
  btnDark,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function InboxThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { threadId } = await params;
  const sp = await searchParams;

  const thread = await prisma.inboxThread.findFirst({
    where: { id: threadId, organizationId: membership.organizationId },
    include: {
      lead: true,
      connection: true,
      brand: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!thread) notFound();

  // Auto-mark read on open (best-effort via parallel form is awkward; do in render via update)
  if (thread.unreadCount > 0) {
    await prisma.conversationMessage.updateMany({
      where: { threadId: thread.id, unread: true },
      data: { unread: false },
    });
    await prisma.inboxThread.update({
      where: { id: thread.id },
      data: { unreadCount: 0 },
    });
  }

  const draft = thread.lead?.draftReply || "";

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/app/inbox"
        backLabel="Inbox"
        title={thread.contactName || thread.contactHandle || "Conversazione"}
        description={`${leadSourceLabel[thread.source]} · ${conversationKindLabel(thread.kind)}${
          thread.subject ? ` · ${thread.subject}` : ""
        }`}
        actions={
          <>
            {thread.lead ? (
              <Link href={`/app/crm/leads/${thread.lead.id}`} className={btnSecondary}>
                Apri lead
              </Link>
            ) : null}
            {thread.permalink ? (
              <a
                href={thread.permalink}
                target="_blank"
                rel="noreferrer"
                className={btnSecondary}
              >
                Permalink
              </a>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusPill>{thread.status}</StatusPill>
        <StatusPill>
          {leadSourceLabel[thread.source]} · {conversationKindLabel(thread.kind)}
        </StatusPill>
        {thread.lead ? (
          <StatusPill>{pipelineStageLabel[thread.lead.pipelineStage]}</StatusPill>
        ) : null}
        {thread.contactHandle ? (
          <span className="text-sm text-slate-500">{thread.contactHandle}</span>
        ) : null}
      </div>

      {sp.send === "ok" ? (
        <FlashOk>
          Risposta {sp.sim === "1" ? "simulata (demo)" : "inviata"} e collegata al lead.
        </FlashOk>
      ) : null}
      {sp.send === "empty" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Scrivi un testo prima di inviare.
        </div>
      ) : null}
      {sp.send === "need_confirm" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Spunta la conferma di invio.
        </div>
      ) : null}
      {sp.send === "fail" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          Invio fallito (canale non configurato). Usa la risposta demo.
        </div>
      ) : null}
      {sp.ai === "1" ? (
        <FlashOk>
          AI commerciale: {sp.decision === "READY_TO_QUOTE" ? "dati ok" : "servono info"}
          {sp.quote ? (
            <>
              {" "}
              ·{" "}
              <Link href={`/app/preventivi/${sp.quote}`} className="font-semibold underline">
                apri preventivo
              </Link>
            </>
          ) : null}
          {sp.missing ? <> · mancano: {sp.missing}</> : null}
        </FlashOk>
      ) : null}
      {sp.ai === "fail" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          AI commerciale: thread senza lead collegato.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard title="Thread" hint="Messaggi in ordine cronologico.">
          <div className="space-y-3">
            {thread.messages.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun messaggio.</p>
            ) : (
              thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    m.direction === "OUT"
                      ? "ml-6 bg-[#0F3D3E] text-white"
                      : "mr-6 border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap gap-2 text-xs opacity-80">
                    <span>{m.direction === "OUT" ? "Tu" : thread.contactName || "Contatto"}</span>
                    <span>·</span>
                    <span>{m.sentAt ? shortDate(m.sentAt) : shortDate(m.createdAt)}</span>
                    {m.status !== "LOGGED" && m.status !== "SENT" ? (
                      <span>· {m.status}</span>
                    ) : null}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              ))
            )}
          </div>

          <form action={replyInboxThread} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="threadId" value={thread.id} />
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Rispondi</span>
              <textarea
                name="body"
                rows={5}
                required
                defaultValue={draft}
                className={fieldClass}
                placeholder={
                  thread.kind === "COMMENT"
                    ? "Risposta pubblica al commento…"
                    : "Risposta DM / mail…"
                }
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" name="confirmSend" value="1" className="mt-1" required />
              <span>
                Confermo l’invio. Di default è <strong>simulato in demo</strong> (nessuna chiave
                Meta/WA richiesta).
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-500">
              <input type="checkbox" name="live" value="1" className="mt-1" />
              <span>Prova invio live se il canale ha token (opzionale).</span>
            </label>
            <button className={btnPrimary}>Invia risposta (demo)</button>
          </form>
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard title="AI commerciale" hint="Parse thread → pipeline → preventivo o bozza dati mancanti.">
            <form action={runInboxCommercialAi}>
              <input type="hidden" name="threadId" value={thread.id} />
              <button className={btnPrimary}>Analizza e aggiorna lead</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Offline: usa intake/auto-quote esistenti. Nessuna API LLM obbligatoria.
            </p>
          </SectionCard>

          <SectionCard title="Stato thread">
            <form action={setThreadStatus} className="space-y-2">
              <input type="hidden" name="threadId" value={thread.id} />
              <select name="status" defaultValue={thread.status} className={fieldClass}>
                <option value="OPEN">Aperto</option>
                <option value="PENDING">In attesa</option>
                <option value="CLOSED">Chiuso</option>
              </select>
              <button className={btnSecondary}>Aggiorna stato</button>
            </form>
            <form action={markThreadRead} className="mt-3">
              <input type="hidden" name="threadId" value={thread.id} />
              <button className={btnDark}>Segna come letto</button>
            </form>
          </SectionCard>

          {thread.lead ? (
            <SectionCard title="Lead collegato">
              <p className="text-sm font-semibold text-[#0F3D3E]">
                {thread.lead.firstName} {thread.lead.lastName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {pipelineStageLabel[thread.lead.pipelineStage]} · {thread.lead.intakeStatus}
              </p>
              {thread.lead.interest ? (
                <p className="mt-2 text-sm text-slate-500">{thread.lead.interest}</p>
              ) : null}
              <Link
                href={`/app/crm/leads/${thread.lead.id}`}
                className="mt-3 inline-block text-sm font-semibold text-[#B33A2B]"
              >
                Apri in pipeline →
              </Link>
            </SectionCard>
          ) : null}

          <SectionCard title="Canale">
            <p className="text-sm text-slate-700">
              {thread.connection?.label || "Sandbox"} · {thread.connection?.kind || "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Adapter offline: nessuna chiamata Graph/TikTok/LinkedIn finché non salvi un token in
              Canali.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
