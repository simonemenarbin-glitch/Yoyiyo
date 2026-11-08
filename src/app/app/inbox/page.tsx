import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { loadSandboxInbox } from "@/lib/actions/inbox";
import { conversationKindLabel } from "@/lib/inbox/types";
import { shortDate } from "@/lib/format";
import { leadSourceLabel } from "@/lib/labels";
import {
  EmptyHint,
  FlashOk,
  PageHeader,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;

  const source = sp.source || "";
  const kind = sp.kind || "";
  const status = sp.status || "OPEN";

  const threads = await prisma.inboxThread.findMany({
    where: {
      organizationId: orgId,
      ...(source ? { source: source as never } : {}),
      ...(kind ? { kind: kind as never } : {}),
      ...(status && status !== "ALL" ? { status: status as never } : {}),
    },
    include: {
      lead: true,
      connection: true,
    },
    orderBy: [{ unreadCount: "desc" }, { lastAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const unreadTotal = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inbox unificata"
        description="DM + commenti + mail in un solo posto (sandbox Meta/WA/mail). Reply → lead e pipeline."
        actions={
          <>
            <Link href="/app/crm/canali" className={btnSecondary}>
              Canali
            </Link>
            <form action={loadSandboxInbox}>
              <input type="hidden" name="back" value="/app/inbox" />
              <button className={btnPrimary}>Carica sandbox</button>
            </form>
          </>
        }
      />

      {sp.threads != null ? (
        <FlashOk>
          Sandbox sync: {sp.threads} thread · {sp.msgs || 0} nuovi messaggi · {sp.leads || 0}{" "}
          lead.
        </FlashOk>
      ) : null}

      <form method="get" className="flex flex-wrap gap-2 rounded-2xl border border-teal-900/10 bg-white/80 p-3">
        <select name="source" defaultValue={source} className={`${fieldClass} w-auto min-w-[8rem]`}>
          <option value="">Tutti i canali</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
          <option value="WEB">Web</option>
        </select>
        <select name="kind" defaultValue={kind} className={`${fieldClass} w-auto min-w-[8rem]`}>
          <option value="">DM + commenti</option>
          <option value="DM">Solo DM</option>
          <option value="COMMENT">Solo commenti</option>
          <option value="EMAIL">Email</option>
        </select>
        <select name="status" defaultValue={status} className={`${fieldClass} w-auto min-w-[8rem]`}>
          <option value="OPEN">Aperti</option>
          <option value="PENDING">In attesa</option>
          <option value="CLOSED">Chiusi</option>
          <option value="ALL">Tutti</option>
        </select>
        <button className={btnSecondary}>Filtra</button>
        <span className="ml-auto self-center text-sm text-slate-500">
          {unreadTotal} non letti · {threads.length} thread
        </span>
      </form>

      {threads.length === 0 ? (
        <EmptyHint>
          Nessun thread. Clicca <strong>Carica sandbox</strong> per DM/commenti Meta + WA + mail di
          demo (senza chiavi live).
        </EmptyHint>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/90">
          <ul className="divide-y divide-slate-100">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/inbox/${t.id}`}
                  className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="mt-1 w-2 shrink-0">
                    {t.unreadCount > 0 ? (
                      <span className="block h-2 w-2 rounded-full bg-[#B33A2B]" aria-label="Non letto" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#0F3D3E]">
                        {t.contactName || t.contactHandle || "Sconosciuto"}
                      </span>
                      <StatusPill>
                        {leadSourceLabel[t.source]} · {conversationKindLabel(t.kind)}
                      </StatusPill>
                      {t.unreadCount > 0 ? (
                        <span className="rounded-full bg-[#B33A2B]/10 px-2 py-0.5 text-xs font-semibold text-[#B33A2B]">
                          {t.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-slate-700">
                      {t.subject || "(senza oggetto)"}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-slate-500">
                      {t.lastBody || "—"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>{t.lastAt ? shortDate(t.lastAt) : "—"}</span>
                      {t.lead ? (
                        <span>
                          Lead {t.lead.firstName} {t.lead.lastName} · {t.lead.pipelineStage}
                        </span>
                      ) : (
                        <span>Senza lead</span>
                      )}
                      {t.contactHandle ? <span>{t.contactHandle}</span> : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
