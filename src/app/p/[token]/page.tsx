import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { eur } from "@/lib/format";
import { productTypeLabel } from "@/lib/labels";
import { pickPartnerLists } from "@/lib/b2b/pricing";

export default async function PromoterPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const partner = await prisma.agencyPartner.findFirst({
    where: { portalToken: token, portalEnabled: true },
    include: {
      net: true,
      organization: true,
      priceLists: {
        where: { active: true },
        include: { lines: { orderBy: { title: "asc" } } },
      },
    },
  });
  if (!partner) notFound();

  const orgLists = await prisma.partnerPriceList.findMany({
    where: {
      organizationId: partner.organizationId,
      active: true,
      OR: [
        { partnerId: partner.id },
        { netId: partner.netId || undefined, partnerId: null },
        { netId: null, partnerId: null },
      ],
    },
    include: { lines: { orderBy: { title: "asc" } }, net: true },
    orderBy: { updatedAt: "desc" },
  });

  const lists = pickPartnerLists(orgLists, {
    partnerId: partner.id,
    netId: partner.netId,
  });

  const primary = lists[0];
  const lines = primary?.lines || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#FFF8F6_0%,_#F3F7F7_45%,_#E8EEEE_100%)]">
      <header className="border-b border-[#0F3D3E]/10 bg-[#0F3D3E] text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-teal-100/70">Portale promoter</div>
            <h1
              className="mt-1 text-3xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {partner.organization.name}
            </h1>
            <p className="mt-1 text-sm text-teal-50/90">
              Area riservata · {partner.name}
              {partner.net ? ` · rete ${partner.net.code}` : ""}
            </p>
          </div>
          <div className="text-sm text-teal-100/80">
            Listino {primary?.name || "non ancora pubblicato"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-[#0F3D3E]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F3D3E]">Condizioni rete</h2>
          <p className="mt-1 text-sm text-slate-600">
            Netto agenzia già scontato per la tua fascia. La vendita suggerita è un riferimento banco
            B2C — puoi applicare il tuo markup commerciale.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-slate-400">Rete</dt>
              <dd className="font-medium">{partner.net?.name || "Standard"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Provvigione partner</dt>
              <dd className="font-medium">{partner.commissionPct}%</dd>
            </div>
            <div>
              <dt className="text-slate-400">Referente</dt>
              <dd className="font-medium">{partner.contactName || partner.email || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#0F3D3E]/10 bg-white/90 shadow-sm">
          <div className="border-b border-slate-100 bg-[#B33A2B] px-4 py-3 text-sm font-semibold text-white">
            Listino netto agenzia
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FFF8F6] text-xs uppercase tracking-wide text-[#B33A2B]">
              <tr>
                <th className="px-4 py-3">Servizio</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Tuo netto</th>
                <th className="px-4 py-3 text-right">Vendita sugg.</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-[#0F3D3E]">{line.title}</td>
                  <td className="px-4 py-3">{productTypeLabel[line.serviceType]}</td>
                  <td className="px-4 py-3 text-right font-semibold">{eur(line.agencyNet)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{eur(line.suggestedSell)}</td>
                </tr>
              ))}
              {!lines.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-500">
                    Il tour operator non ha ancora pubblicato voci sul tuo listino.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <p className="text-center text-xs text-slate-500">
          Accesso token-based · non condividere il link · Yoyiyo / Rotta B2B
        </p>
      </main>
    </div>
  );
}
