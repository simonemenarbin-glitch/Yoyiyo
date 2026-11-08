import Link from "next/link";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { eur, marginLabel, shortDate } from "@/lib/format";
import { practiceStatusLabel, quoteStatusLabel } from "@/lib/labels";
import { EmptyState, PageHeader, btnPrimary, btnSecondary } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [
    practices,
    quotes,
    products,
    partners,
    leadsOpen,
    unreadInbox,
    leadsNew,
    invoicesArOpen,
  ] = await Promise.all([
    prisma.practice.findMany({
      where: { organizationId: orgId },
      include: { customer: true, partner: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.catalogProduct.count({ where: { organizationId: orgId, active: true } }),
    prisma.agencyPartner.count({ where: { organizationId: orgId } }),
    prisma.lead.count({
      where: {
        organizationId: orgId,
        pipelineStage: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.inboxThread.aggregate({
      where: { organizationId: orgId, status: "OPEN" },
      _sum: { unreadCount: true },
    }),
    prisma.lead.count({
      where: { organizationId: orgId, pipelineStage: "NEW" },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        direction: "AR",
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      select: { total: true, paidAmount: true },
    }),
  ]);

  const unreadCount = unreadInbox._sum.unreadCount || 0;
  const arOpenAmount = invoicesArOpen.reduce((s, i) => s + (i.total - i.paidAmount), 0);
  const arOpenCount = invoicesArOpen.length;

  const confirmed = practices.filter((p) =>
    ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(p.status),
  );
  const pipeline = practices.reduce((sum, p) => sum + p.totalSell, 0);

  type Todo = {
    key: string;
    label: string;
    value: string;
    href: string;
    cta: string;
    priority: number;
  };

  const todos: Todo[] = [
    {
      key: "inbox",
      label: "Messaggi non letti",
      value: String(unreadCount),
      href: "/app/inbox?tab=unread",
      cta: "Apri inbox",
      priority: unreadCount > 0 ? 3 : 0,
    },
    {
      key: "leads",
      label: "Lead nuovi",
      value: String(leadsNew),
      href: "/app/crm",
      cta: "Apri pipeline",
      priority: leadsNew > 0 ? 2 : 0,
    },
    {
      key: "ar",
      label: "Fatture da incassare",
      value: arOpenCount > 0 ? `${arOpenCount} · ${eur(arOpenAmount)}` : "0",
      href: "/app/contabilita?direction=AR",
      cta: "Vedi fatture",
      priority: arOpenCount > 0 ? 1 : 0,
    },
  ];

  const primaryTodo =
    todos.find((t) => t.key === "inbox" && unreadCount > 0) ||
    todos.find((t) => t.key === "leads" && leadsNew > 0) ||
    todos.find((t) => t.key === "ar" && arOpenCount > 0) ||
    todos[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Nucleo operativo"
        description="Lavora i messaggi, i lead nuovi e le fatture da incassare — poi chiudi preventivi e pratiche."
        actions={
          <>
            <Link href={primaryTodo.href} className={btnPrimary}>
              {primaryTodo.cta}
            </Link>
            <Link href="/app/preventivi/nuovo" className={btnSecondary}>
              Nuovo preventivo
            </Link>
            <Link href="/app/crm/canali" className={btnSecondary}>
              Canali
            </Link>
          </>
        }
      />

      <section className="rounded-2xl border border-teal-900/10 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,61,62,0.05)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Da fare oggi</h2>
            <p className="text-sm text-slate-500">Priorità operative, non setup.</p>
          </div>
          <Link href={primaryTodo.href} className={`${btnPrimary} text-sm`}>
            {primaryTodo.cta}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {todos.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`rounded-xl border px-4 py-3 transition hover:border-teal-800/30 hover:bg-teal-50/40 ${
                t.key === primaryTodo.key && t.priority > 0
                  ? "border-[#0F3D3E]/35 bg-teal-50/50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-slate-400">{t.label}</div>
              <div className="mt-1 text-xl font-semibold text-[#0F3D3E]">{t.value}</div>
              <div className="mt-2 text-sm font-medium text-teal-800/80">{t.cta} →</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lead aperti" value={String(leadsOpen)} hint="pipeline attiva" />
        <StatCard
          label="Pipeline vendita"
          value={eur(pipeline)}
          hint={`${practices.length} pratiche recenti`}
        />
        <StatCard
          label="Listino attivo"
          value={String(products)}
          hint="listino proprio + connettori"
        />
        <StatCard
          label="Partner B2B"
          value={String(partners)}
          hint={`${confirmed.length} pratiche avanzate`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Pratiche</h2>
            <Link href="/app/pratiche" className="text-sm text-teal-800/70">
              Vedi tutte
            </Link>
          </div>
          {practices.length === 0 ? (
            <EmptyState
              title="Nessuna pratica ancora"
              action={
                <Link href="/app/pratiche/nuova" className={btnPrimary}>
                  Crea pratica
                </Link>
              }
            >
              Trasforma un preventivo accettato in pratica operativa.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {practices.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/pratiche/${p.id}`}
                  className="block rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-800/20 hover:bg-teal-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-slate-500">
                        {p.reference} · {p.partner?.name || p.customer?.lastName || "—"} ·{" "}
                        {shortDate(p.departureDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusPill>{practiceStatusLabel[p.status]}</StatusPill>
                      <div className="mt-1 text-sm font-medium">{eur(p.totalSell)}</div>
                      <div className="text-xs text-slate-500">
                        margine {marginLabel(p.totalSell, p.totalCost)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Preventivi</h2>
            <Link href="/app/preventivi" className="text-sm text-teal-800/70">
              Vedi tutti
            </Link>
          </div>
          {quotes.length === 0 ? (
            <EmptyState
              title="Nessun preventivo"
              action={
                <Link href="/app/preventivi/nuovo" className={btnPrimary}>
                  Nuovo preventivo
                </Link>
              }
            >
              Parti da un lead in pipeline o crea un preventivo da zero.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/app/preventivi/${q.id}`}
                  className="block rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-800/20 hover:bg-teal-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{q.title}</div>
                      <div className="text-sm text-slate-500">
                        {q.number} · valido fino al {shortDate(q.validUntil)}
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusPill>{quoteStatusLabel[q.status]}</StatusPill>
                      <div className="mt-1 text-sm font-medium">{eur(q.totalSell)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
