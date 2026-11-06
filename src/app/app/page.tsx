import Link from "next/link";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { eur, marginLabel, shortDate } from "@/lib/format";
import { practiceStatusLabel, quoteStatusLabel } from "@/lib/labels";
import { PageHeader, btnPrimary, btnSecondary } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [practices, quotes, products, partners, leadsOpen] = await Promise.all([
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
  ]);

  const confirmed = practices.filter((p) =>
    ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(p.status),
  );
  const pipeline = practices.reduce((sum, p) => sum + p.totalSell, 0);
  const avgMargin =
    practices.length === 0
      ? 0
      : practices.reduce((sum, p) => sum + p.marginPct, 0) / practices.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Nucleo operativo"
        description="Aggiorna i canali, lavora i lead in pipeline, chiudi i preventivi."
        actions={
          <>
            <Link href="/app/crm/canali" className={btnPrimary}>
              Aggiorna canali
            </Link>
            <Link href="/app/crm" className={btnSecondary}>
              Apri pipeline
            </Link>
            <Link href="/app/preventivi/nuovo" className={btnSecondary}>
              Nuovo preventivo
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lead aperti" value={String(leadsOpen)} hint="pipeline attiva" />
        <StatCard label="Pipeline vendita" value={eur(pipeline)} hint={`${practices.length} pratiche recenti`} />
        <StatCard label="Listino attivo" value={String(products)} hint="OWN_LIST + slot API" />
        <StatCard label="Partner B2B" value={String(partners)} hint={`${confirmed.length} pratiche avanzate`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Pratiche</h2>
            <Link href="/app/pratiche" className="text-sm text-teal-800/70">
              Vedi tutte
            </Link>
          </div>
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
        </section>

        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Preventivi</h2>
            <Link href="/app/preventivi" className="text-sm text-teal-800/70">
              Vedi tutti
            </Link>
          </div>
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
        </section>
      </div>
    </div>
  );
}
