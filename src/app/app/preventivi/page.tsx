import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur, shortDate } from "@/lib/format";
import { channelLabel, pipelineStageLabel, quoteStatusLabel } from "@/lib/labels";

export default async function QuotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const quotes = await prisma.quote.findMany({
    where: { organizationId: membership.organizationId },
    include: { partner: true, customer: true, brand: true, lead: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">Vendita</div>
          <h1
            className="mt-1 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Preventivi lavorabili
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Da lead CRM o da zero — righe da listino proprio (API fornitori in coda).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/crm"
            className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
          >
            Da pipeline
          </Link>
          <Link
            href="/app/preventivi/nuovo"
            className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white"
          >
            Nuovo preventivo
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Numero</th>
              <th className="px-4 py-3 font-medium">Destinatario / lead</th>
              <th className="px-4 py-3 font-medium">Canale</th>
              <th className="px-4 py-3 font-medium">Pipeline</th>
              <th className="px-4 py-3 font-medium">Validità</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium text-right">Totale</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t border-slate-100 hover:bg-teal-50/40">
                <td className="px-4 py-3">
                  <Link href={`/app/preventivi/${q.id}`} className="font-medium text-[#0F3D3E]">
                    {q.number}
                  </Link>
                  <div className="text-slate-500">{q.title}</div>
                </td>
                <td className="px-4 py-3">
                  {q.partner?.name ||
                    (q.customer ? `${q.customer.firstName} ${q.customer.lastName}` : "—")}
                  {q.lead ? (
                    <div className="text-xs text-slate-500">
                      lead {q.lead.lastName} {q.lead.firstName}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{channelLabel[q.channel]}</td>
                <td className="px-4 py-3">
                  <StatusPill>{pipelineStageLabel[q.pipelineStage]}</StatusPill>
                </td>
                <td className="px-4 py-3">{shortDate(q.validUntil)}</td>
                <td className="px-4 py-3">
                  <StatusPill>{quoteStatusLabel[q.status]}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right font-medium">{eur(q.totalSell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
