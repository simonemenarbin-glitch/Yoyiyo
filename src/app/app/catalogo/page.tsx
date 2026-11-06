import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur } from "@/lib/format";
import { priceSourceLabel, productTypeLabel } from "@/lib/labels";
import { createCatalogProduct } from "@/lib/actions/catalog";
import { PageHeader, btnDark, fieldClass } from "@/components/ui";

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const products = await prisma.catalogProduct.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      ratePlans: true,
      periods: true,
      allotments: true,
      supplements: true,
      policies: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contratti"
        title="Catalogo e contratti"
        description="Listino proprio con periodi stagionali, allotment, supplementi e politiche — stile Medusa produzione."
      />

      <form
        action={createCatalogProduct}
        className="grid gap-3 rounded-2xl border border-teal-900/10 bg-white/80 p-4 md:grid-cols-6"
      >
        <input name="name" required placeholder="Nome servizio" className={`${fieldClass} md:col-span-2`} />
        <select name="type" className={fieldClass}>
          {Object.entries(productTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input name="city" placeholder="Città" className={fieldClass} />
        <input name="netCost" type="number" step="1" placeholder="Netto" className={fieldClass} />
        <input name="sellPrice" type="number" step="1" placeholder="Vendita" className={fieldClass} />
        <button className={`${btnDark} md:col-span-6 md:w-fit`}>Aggiungi al catalogo</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Prodotto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Contratto</th>
              <th className="px-4 py-3 font-medium">Fonte</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium text-right">Vendita base</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const rate = p.ratePlans[0];
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/app/catalogo/${p.id}`} className="font-medium text-[#0F3D3E] hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-slate-500">{p.code || "—"} · {p.city || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{productTypeLabel[p.type]}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {p.periods.length} periodi · {p.allotments.length} allot. · {p.supplements.length}{" "}
                    supp. · {p.policies.length} policy
                  </td>
                  <td className="px-4 py-3">{priceSourceLabel[p.priceSource]}</td>
                  <td className="px-4 py-3">
                    <StatusPill>{p.active ? "Attivo" : "Off"}</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {rate ? eur(rate.sellPrice) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
