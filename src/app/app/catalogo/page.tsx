import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { eur } from "@/lib/format";
import { priceSourceLabel, productTypeLabel } from "@/lib/labels";

async function createProduct(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "HOTEL") as
    | "HOTEL"
    | "FLIGHT"
    | "TRANSFER"
    | "EXCURSION"
    | "CRUISE"
    | "FERRY"
    | "INSURANCE"
    | "PACKAGE"
    | "OTHER";
  const city = String(formData.get("city") || "") || null;
  const code = String(formData.get("code") || "") || null;
  const netCost = Number(formData.get("netCost") || 0);
  const sellPrice = Number(formData.get("sellPrice") || 0);

  await prisma.catalogProduct.create({
    data: {
      organizationId: membership.organizationId,
      name,
      type,
      city,
      code,
      country: "Cina",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "Tariffa base",
          netCost,
          sellPrice,
        },
      },
    },
  });

  redirect("/app/catalogo");
}

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const products = await prisma.catalogProduct.findMany({
    where: { organizationId: membership.organizationId },
    include: { ratePlans: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">Contratti</div>
        <h1
          className="mt-1 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Listino servizi
        </h1>
        <p className="mt-1 text-slate-600">
          Listino proprio oggi (OWN_LIST). Ogni prodotto ha già priceSource / supplierRef per le API fornitori.
        </p>
      </div>

      <form
        action={createProduct}
        className="grid gap-3 rounded-2xl border border-teal-900/10 bg-white/80 p-4 md:grid-cols-6"
      >
        <input
          name="name"
          required
          placeholder="Nome servizio"
          className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2"
        />
        <select name="type" className="rounded-xl border border-slate-200 px-3 py-2">
          {Object.entries(productTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input name="city" placeholder="Città" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input
          name="netCost"
          type="number"
          step="1"
          placeholder="Netto"
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
        <input
          name="sellPrice"
          type="number"
          step="1"
          placeholder="Vendita"
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
        <button className="rounded-xl bg-[#0F3D3E] px-4 py-2 text-sm font-medium text-white md:col-span-6 md:w-fit">
          Aggiungi al catalogo
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Prodotto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Fonte</th>
              <th className="px-4 py-3 font-medium">Città</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium text-right">Netto</th>
              <th className="px-4 py-3 font-medium text-right">Vendita</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const rate = p.ratePlans[0];
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-slate-500">{p.code || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{productTypeLabel[p.type]}</td>
                  <td className="px-4 py-3">{priceSourceLabel[p.priceSource]}</td>
                  <td className="px-4 py-3">{p.city || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill>{p.active ? "Attivo" : "Off"}</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right">{rate ? eur(rate.netCost) : "—"}</td>
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
