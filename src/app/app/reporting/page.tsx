import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionCard, btnDark, btnSecondary } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";
import { eur, shortDate } from "@/lib/format";
import { channelLabel } from "@/lib/labels";
import {
  aggregateByBrand,
  aggregateByChannel,
  marginAbs,
  type PracticeMarginRow,
} from "@/lib/reporting/margins";
import {
  generateCashDeadlinesForPractice,
  markCashDeadlinePaid,
  syncOverdueCashDeadlines,
} from "@/lib/actions/reporting";

export default async function ReportingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const practices = await prisma.practice.findMany({
    where: { organizationId: orgId },
    include: { brand: true },
    orderBy: { updatedAt: "desc" },
  });

  const rows: PracticeMarginRow[] = practices.map((p) => ({
    id: p.id,
    reference: p.reference,
    title: p.title,
    status: p.status,
    brandId: p.brandId,
    brandName: p.brand?.name || null,
    channel: p.channel,
    totalSell: p.totalSell,
    totalCost: p.totalCost,
    marginPct: p.marginPct,
    marginAbs: marginAbs(p.totalSell, p.totalCost),
  }));

  const byBrand = aggregateByBrand(rows);
  const byChannel = aggregateByChannel(rows);
  const totalSell = rows.reduce((s, r) => s + r.totalSell, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalMargin = marginAbs(totalSell, totalCost);

  const deadlines = await prisma.cashDeadline.findMany({
    where: { organizationId: orgId },
    include: { practice: true },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  const openCash = deadlines
    .filter((d) => d.status === "OPEN" || d.status === "OVERDUE")
    .reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direzione"
        title="Reporting margini e cassa"
        description="Margini reali per pratica e marchio, scadenze acconti/saldi/fornitori — cruscotto Medusa-style."
        actions={
          <form action={syncOverdueCashDeadlines}>
            <button className={btnSecondary}>Aggiorna scadute</button>
          </form>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">Venduto</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(totalSell)}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">Margine assoluto</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(totalMargin)}</div>
          <div className="text-sm text-slate-500">
            su costo {eur(totalCost)} ·{" "}
            {totalSell > 0 ? Math.round((totalMargin / totalSell) * 1000) / 10 : 0}%
          </div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">Cassa aperta</div>
          <div className="mt-1 text-2xl font-semibold text-[#B33A2B]">{eur(openCash)}</div>
          <div className="text-sm text-slate-500">{deadlines.length} scadenze</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Margini per marchio">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 text-left">Brand</th>
                <th className="py-2 text-right">Venduto</th>
                <th className="py-2 text-right">Margine</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {byBrand.map((b) => (
                <tr key={b.brandId || "none"} className="border-t border-slate-100">
                  <td className="py-2">{b.brandName}</td>
                  <td className="py-2 text-right">{eur(b.sell)}</td>
                  <td className="py-2 text-right font-medium">{eur(b.marginAbs)}</td>
                  <td className="py-2 text-right">{b.marginPct}%</td>
                </tr>
              ))}
              {!byBrand.length ? (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-500">
                    Nessuna pratica.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Margini per canale">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 text-left">Canale</th>
                <th className="py-2 text-right">Venduto</th>
                <th className="py-2 text-right">Margine</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map((c) => (
                <tr key={c.channel} className="border-t border-slate-100">
                  <td className="py-2">{channelLabel[c.channel as keyof typeof channelLabel] || c.channel}</td>
                  <td className="py-2 text-right">{eur(c.sell)}</td>
                  <td className="py-2 text-right font-medium">
                    {eur(c.marginAbs)} ({c.marginPct}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <SectionCard title="Margine per pratica">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F3D3E] text-white">
              <tr>
                <th className="px-3 py-2">Pratica</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2 text-right">Vendita</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2 text-right">Margine</th>
                <th className="px-3 py-2">Cassa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link href={`/app/pratiche/${r.id}`} className="font-medium text-[#0F3D3E] hover:underline">
                      {r.reference}
                    </Link>
                    <div className="text-xs text-slate-500">{r.title}</div>
                  </td>
                  <td className="px-3 py-2">{r.brandName || "—"}</td>
                  <td className="px-3 py-2 text-right">{eur(r.totalSell)}</td>
                  <td className="px-3 py-2 text-right">{eur(r.totalCost)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {eur(r.marginAbs)} ({Math.round(r.marginPct * 10) / 10}%)
                  </td>
                  <td className="px-3 py-2">
                    <form action={generateCashDeadlinesForPractice}>
                      <input type="hidden" name="practiceId" value={r.id} />
                      <button className="text-xs font-medium text-teal-800 underline">Genera scadenze</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Scadenze cassa" hint="Acconti, saldi, pagamenti fornitori">
        <ul className="space-y-2">
          {deadlines.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-[#0F3D3E]">{d.label}</div>
                <div className="text-xs text-slate-500">
                  {shortDate(d.dueDate)} · {d.kind}
                  {d.practice ? ` · ${d.practice.reference}` : ""}
                  {d.notes ? ` · ${d.notes}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{eur(d.amount)}</span>
                <StatusPill>{d.status}</StatusPill>
                {d.status !== "PAID" && d.status !== "WAIVED" ? (
                  <form action={markCashDeadlinePaid}>
                    <input type="hidden" name="deadlineId" value={d.id} />
                    <button className={btnDark + " !min-h-8 !px-2 !text-xs"}>Segna pagato</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
          {!deadlines.length ? (
            <li className="text-sm text-slate-500">
              Nessuna scadenza — genera dalle pratiche sopra.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}
