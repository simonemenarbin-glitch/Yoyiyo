import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur, marginLabel, shortDate } from "@/lib/format";
import { channelLabel, practiceStatusLabel, productTypeLabel } from "@/lib/labels";

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const practice = await prisma.practice.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      brand: true,
      customer: true,
      partner: true,
      lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      quotes: true,
    },
  });

  if (!practice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/pratiche" className="text-sm text-teal-800/70">
            ← Pratiche
          </Link>
          <h1
            className="mt-2 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {practice.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <StatusPill>{practiceStatusLabel[practice.status]}</StatusPill>
            <span>{practice.reference}</span>
            <span>·</span>
            <span>{channelLabel[practice.channel]}</span>
            <span>·</span>
            <span>{practice.brand?.name || "Senza brand"}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 px-5 py-4 text-right">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Vendita</div>
          <div className="text-2xl font-semibold text-[#0F3D3E]">{eur(practice.totalSell)}</div>
          <div className="text-sm text-slate-500">
            costo {eur(practice.totalCost)} · margine{" "}
            {marginLabel(practice.totalSell, practice.totalCost)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Cliente</div>
          <div className="mt-1 font-medium">
            {practice.customer
              ? `${practice.customer.firstName} ${practice.customer.lastName}`
              : "—"}
          </div>
          <div className="text-sm text-slate-500">{practice.customer?.email || ""}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Partner B2B</div>
          <div className="mt-1 font-medium">{practice.partner?.name || "—"}</div>
          <div className="text-sm text-slate-500">{practice.partner?.email || ""}</div>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-900/50">Date</div>
          <div className="mt-1 font-medium">
            {shortDate(practice.departureDate)} → {shortDate(practice.returnDate)}
          </div>
          <div className="text-sm text-slate-500">{practice.paxCount} pax</div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F3D3E]">
          Servizi in pratica
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Servizio</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Costo</th>
              <th className="px-4 py-2 font-medium text-right">Vendita</th>
            </tr>
          </thead>
          <tbody>
            {practice.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{line.title}</div>
                  <div className="text-slate-500">{line.product?.code || line.status}</div>
                </td>
                <td className="px-4 py-3">{productTypeLabel[line.serviceType]}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3 text-right">{eur(line.netCost)}</td>
                <td className="px-4 py-3 text-right font-medium">{eur(line.sellPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {practice.quotes.length > 0 ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-4">
          <div className="mb-3 font-semibold text-[#0F3D3E]">Preventivi collegati</div>
          <div className="space-y-2">
            {practice.quotes.map((q) => (
              <Link
                key={q.id}
                href={`/app/preventivi/${q.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:bg-teal-50/40"
              >
                <span>
                  {q.number} — {q.title}
                </span>
                <span className="font-medium">{eur(q.totalSell)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
