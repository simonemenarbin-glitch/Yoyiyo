import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionCard, btnDark, btnSecondary } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";
import { eur, shortDate } from "@/lib/format";
import { createFiscalFromPractice } from "@/lib/actions/accounting";
import { computeSeventyFourTer } from "@/lib/accounting/seventy-four-ter";

export default async function ContabilitaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orgId = primaryMembership(user)!.organizationId;

  const [docs, practices] = await Promise.all([
    prisma.fiscalDocument.findMany({
      where: { organizationId: orgId },
      include: { practice: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.practice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "QUOTED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const vatDue = docs
    .filter((d) => d.status !== "CANCELLED" && d.status !== "DRAFT")
    .reduce((s, d) => s + d.vatAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilità"
        title="Regime 74-ter"
        description="IVA sul margine (corrispettivi − costi viaggio). Invio SdI solo stub offline — nessun certificato in repo."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">Documenti</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{docs.length}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">IVA 74-ter (emessa)</div>
          <div className="mt-1 text-2xl font-semibold text-[#0F3D3E]">{eur(vatDue)}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
          <div className="text-xs uppercase text-slate-400">SdI</div>
          <div className="mt-1 text-sm text-slate-600">Stub demo — nessun invio reale</div>
        </div>
      </div>

      <SectionCard title="Documenti fiscali">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F3D3E] text-white">
              <tr>
                <th className="px-3 py-2">Numero</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-right">Margine / IVA</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">SdI</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link href={`/app/contabilita/${d.id}`} className="font-medium text-[#0F3D3E] hover:underline">
                      {d.number}
                    </Link>
                    <div className="text-xs text-slate-500">{shortDate(d.issueDate)}</div>
                  </td>
                  <td className="px-3 py-2">{d.customerName}</td>
                  <td className="px-3 py-2 text-right">
                    {eur(d.marginBase)} / {eur(d.vatAmount)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill>{d.status}</StatusPill>
                  </td>
                  <td className="px-3 py-2 text-xs">{d.sdiStatus}</td>
                </tr>
              ))}
              {!docs.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-500">
                    Nessun documento — genera da una pratica.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Genera fattura 74-ter da pratica" hint="Calcolo automatico margine e IVA">
        <ul className="space-y-2">
          {practices.map((p) => {
            const preview = computeSeventyFourTer({
              totalSell: p.totalSell,
              totalCost: p.totalCost,
            });
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-[#0F3D3E]">
                    {p.reference} — {p.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    Venduto {eur(p.totalSell)} · costo {eur(p.totalCost)} → IVA stimata{" "}
                    {eur(preview.vatAmount)}
                  </div>
                </div>
                <form action={createFiscalFromPractice}>
                  <input type="hidden" name="practiceId" value={p.id} />
                  <button className={btnDark + " !min-h-9 !text-xs"}>Crea bozza 74-ter</button>
                </form>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Riferimento normativo: art. 74-ter DPR 633/72. Questa UI non sostituisce il consulente fiscale.
        </p>
        <Link href="/app/reporting" className={btnSecondary + " mt-3 inline-flex"}>
          Vai al reporting
        </Link>
      </SectionCard>
    </div>
  );
}
