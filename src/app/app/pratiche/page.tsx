import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur, shortDate } from "@/lib/format";
import { channelLabel, practiceStatusLabel } from "@/lib/labels";

export default async function PracticesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const practices = await prisma.practice.findMany({
    where: { organizationId: membership.organizationId },
    include: { customer: true, partner: true, brand: true, lines: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">Operations</div>
          <h1
            className="mt-1 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Pratiche
          </h1>
        </div>
        <Link
          href="/app/pratiche/nuova"
          className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white"
        >
          Nuova pratica
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Riferimento</th>
              <th className="px-4 py-3 font-medium">Cliente / Partner</th>
              <th className="px-4 py-3 font-medium">Canale</th>
              <th className="px-4 py-3 font-medium">Partenza</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium text-right">Vendita</th>
            </tr>
          </thead>
          <tbody>
            {practices.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-teal-50/40">
                <td className="px-4 py-3">
                  <Link href={`/app/pratiche/${p.id}`} className="font-medium text-[#0F3D3E]">
                    {p.reference}
                  </Link>
                  <div className="text-slate-500">{p.title}</div>
                </td>
                <td className="px-4 py-3">
                  {p.partner?.name || "—"}
                  <div className="text-slate-500">
                    {p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : "—"}
                  </div>
                </td>
                <td className="px-4 py-3">{channelLabel[p.channel]}</td>
                <td className="px-4 py-3">{shortDate(p.departureDate)}</td>
                <td className="px-4 py-3">
                  <StatusPill>{practiceStatusLabel[p.status]}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right font-medium">{eur(p.totalSell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
