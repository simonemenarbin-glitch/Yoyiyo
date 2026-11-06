import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  bootstrapDefaultImapChannels,
  deleteChannelConnection,
  enqueueDemoMessages,
  refreshAllChannels,
  saveChannelConnection,
} from "@/lib/actions/channels";
import { shortDate } from "@/lib/format";
import { leadSourceLabel } from "@/lib/labels";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;

  const [channels, recent] = await Promise.all([
    prisma.channelConnection.findMany({
      where: { organizationId: orgId },
      orderBy: [{ enabled: "desc" }, { label: "asc" }],
    }),
    prisma.ingestedMessage.findMany({
      where: { organizationId: orgId },
      include: { lead: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const flash =
    sp.leads != null
      ? {
          leads: Number(sp.leads || 0),
          quotes: Number(sp.quotes || 0),
          drafts: Number(sp.drafts || 0),
          skipped: Number(sp.skipped || 0),
          err: Number(sp.err || 0),
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">CRM sync</div>
          <h1
            className="mt-1 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Canali → lead automatici
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Configura IMAP e gli altri canali. Un click su <strong>Aggiorna</strong> legge i nuovi
            messaggi, crea i lead e prepara il preventivo bozza oppure la risposta per i dati
            mancanti.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={bootstrapDefaultImapChannels}>
            <button className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]">
              Prepara caselle Yoyiyo
            </button>
          </form>
          <form action={refreshAllChannels}>
            <button className="rounded-xl bg-[#B33A2B] px-5 py-2.5 text-sm font-semibold text-white">
              Aggiorna
            </button>
          </form>
        </div>
      </div>

      {flash ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Sync completato: <strong>{flash.leads}</strong> lead ·{" "}
          <strong>{flash.quotes}</strong> preventivi bozza · <strong>{flash.drafts}</strong>{" "}
          risposte pronte · {flash.skipped} già visti
          {flash.err ? ` · ${flash.err} errori (vedi canale)` : ""}.{" "}
          <Link href="/app/crm" className="underline">
            Apri pipeline
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {channels.map((c) => (
          <section
            key={c.id}
            className="rounded-2xl border border-teal-900/10 bg-white/80 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#0F3D3E]">{c.label}</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  <StatusPill>{leadSourceLabel[c.source]}</StatusPill>
                  <StatusPill>{c.kind}</StatusPill>
                  <StatusPill>{c.enabled ? "ON" : "OFF"}</StatusPill>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                {c.lastSyncAt ? `sync ${shortDate(c.lastSyncAt)}` : "mai sync"}
              </div>
            </div>
            {c.lastError ? (
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                {c.lastError}
              </div>
            ) : null}

            <form action={saveChannelConnection} className="mt-4 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="kind" value={c.kind} />
              <label className="block text-xs sm:col-span-2">
                <span className="mb-1 block text-slate-600">Etichetta</span>
                <input
                  name="label"
                  defaultValue={c.label}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              {c.kind === "IMAP" ? (
                <>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Host IMAP</span>
                    <input
                      name="host"
                      defaultValue={c.host || "imap.hostinger.com"}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Porta</span>
                    <input
                      name="port"
                      type="number"
                      defaultValue={c.port || 993}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Utente</span>
                    <input
                      name="username"
                      defaultValue={c.username || ""}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Password</span>
                    <input
                      name="secret"
                      type="password"
                      placeholder={c.secret ? "•••••••• (invariata se vuota)" : "obbligatoria"}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Mailbox</span>
                    <input
                      name="mailbox"
                      defaultValue={c.mailbox || "INBOX"}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block text-slate-600">Giorni indietro</span>
                    <input
                      name="lookbackDays"
                      type="number"
                      defaultValue={c.lookbackDays}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-xs sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Token API / access token</span>
                    <input
                      name="token"
                      type="password"
                      placeholder="incolla token Meta / WhatsApp / form secret"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  {c.kind === "WHATSAPP_CLOUD" ? (
                    <label className="block text-xs sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Phone number ID</span>
                      <input
                        name="phoneNumberId"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  ) : null}
                  {c.kind === "META_FACEBOOK" || c.kind === "META_INSTAGRAM" ? (
                    <label className="block text-xs sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Page / IG business ID</span>
                      <input
                        name="pageId"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  ) : null}
                  <label className="block text-xs sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Webhook verify token</span>
                    <input
                      name="verifyToken"
                      placeholder="rotta-verify"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <p className="sm:col-span-2 text-xs text-slate-500">
                    Webhook: <code>/api/channels/webhook/{c.id}</code> — oppure «Coda demo» per
                    testare senza API.
                  </p>
                </>
              )}
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <input type="checkbox" name="enabled" value="1" defaultChecked={c.enabled} />
                Canale attivo (incluso in Aggiorna)
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button className="rounded-xl bg-[#0F3D3E] px-3 py-2 text-sm text-white">
                  Salva
                </button>
              </div>
            </form>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.kind !== "IMAP" ? (
                <form action={enqueueDemoMessages}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                    Coda messaggio demo
                  </button>
                </form>
              ) : null}
              <form action={deleteChannelConnection}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700">
                  Elimina
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>

      {channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-900/20 bg-white/50 px-6 py-10 text-center">
          <p className="text-sm text-slate-600">Nessun canale. Prepara le caselle Yoyiyo IMAP e i placeholder social.</p>
          <form action={bootstrapDefaultImapChannels} className="mt-4">
            <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white">
              Prepara canali
            </button>
          </form>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F3D3E]">
          Ultimi messaggi ingeriti
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">Ancora nessun sync.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-[#0F3D3E]">
                    {m.subject || m.fromAddress || m.fromName || "Messaggio"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {leadSourceLabel[m.source]} · {m.status}
                    {m.lead ? ` · lead ${m.lead.lastName}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.leadId ? (
                    <Link href={`/app/crm/leads/${m.leadId}`} className="text-xs underline">
                      Apri lead
                    </Link>
                  ) : null}
                  {m.quoteId ? (
                    <Link href={`/app/preventivi/${m.quoteId}`} className="text-xs underline">
                      Preventivo
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Nuovo canale IMAP</h2>
        <form action={saveChannelConnection} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="kind" value="IMAP" />
          <input type="hidden" name="enabled" value="1" />
          <label className="block text-xs">
            <span className="mb-1 block text-slate-600">Etichetta</span>
            <input name="label" required placeholder="es. laura@yoyiyo.it" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-600">Utente</span>
            <input name="username" required className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-600">Host</span>
            <input name="host" defaultValue="imap.hostinger.com" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-600">Password</span>
            <input name="secret" type="password" required className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <button className="rounded-xl bg-[#0F3D3E] px-4 py-2 text-sm text-white sm:col-span-2 sm:w-fit">
            Aggiungi IMAP
          </button>
        </form>
      </section>
    </div>
  );
}
