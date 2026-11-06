import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionCard, btnDark, btnSecondary, fieldClass } from "@/components/ui";
import { eur } from "@/lib/format";
import { productTypeLabel } from "@/lib/labels";
import { addPriceListLine, seedPriceListFromCatalog } from "@/lib/actions/b2b";

export default async function PriceListPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const list = await prisma.partnerPriceList.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      net: true,
      partner: true,
      lines: { include: { product: true }, orderBy: { title: "asc" } },
    },
  });
  if (!list) notFound();

  const products = await prisma.catalogProduct.findMany({
    where: { organizationId: membership.organizationId, active: true },
    orderBy: { name: "asc" },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Listino B2B"
        title={list.name}
        description={`${list.net ? `Rete ${list.net.code}` : "Tutte le reti"} · ${
          list.partner ? list.partner.name : "tutti i partner"
        }`}
        backHref="/app/b2b"
        backLabel="Network B2B"
        actions={
          <form action={seedPriceListFromCatalog}>
            <input type="hidden" name="priceListId" value={list.id} />
            <button className={btnSecondary}>Importa da catalogo</button>
          </form>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3">Voce</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Costo TO</th>
              <th className="px-4 py-3 text-right">Netto agenzia</th>
              <th className="px-4 py-3 text-right">Vendita suggerita</th>
            </tr>
          </thead>
          <tbody>
            {list.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{line.title}</td>
                <td className="px-4 py-3">{productTypeLabel[line.serviceType]}</td>
                <td className="px-4 py-3 text-right">{eur(line.netCost)}</td>
                <td className="px-4 py-3 text-right font-medium text-[#0F3D3E]">
                  {eur(line.agencyNet)}
                </td>
                <td className="px-4 py-3 text-right">{eur(line.suggestedSell)}</td>
              </tr>
            ))}
            {!list.lines.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-500">
                  Nessuna voce — importa dal catalogo o aggiungi manualmente.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SectionCard title="Aggiungi voce">
        <form action={addPriceListLine} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="priceListId" value={list.id} />
          <select name="productId" className={fieldClass} defaultValue="">
            <option value="">Prodotto catalogo (opz.)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Titolo override" className={fieldClass} />
          <input name="netCost" type="number" step="1" placeholder="Costo TO" className={fieldClass} />
          <input name="agencyNet" type="number" step="1" placeholder="Netto agenzia (auto)" className={fieldClass} />
          <input name="suggestedSell" type="number" step="1" placeholder="Vendita sugg. (auto)" className={fieldClass} />
          <button className={btnDark}>Aggiungi</button>
        </form>
      </SectionCard>
    </div>
  );
}
