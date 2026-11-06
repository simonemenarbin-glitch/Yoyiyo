import type { PrismaClient } from "@prisma/client";
import { pickRateForDate } from "./pricing";
import type { SupplierAdapter, SupplierOffer, SupplierSearchInput } from "./types";

export function createOwnListAdapter(prisma: PrismaClient): SupplierAdapter {
  return {
    code: "own-list",
    name: "Listino proprio",
    async search(input: SupplierSearchInput): Promise<SupplierOffer[]> {
      const q = (input.query || "").trim().toLowerCase();
      const city = (input.city || "").trim().toLowerCase();
      const products = await prisma.catalogProduct.findMany({
        where: {
          organizationId: input.organizationId,
          active: true,
          priceSource: "OWN_LIST",
          ...(input.serviceType ? { type: input.serviceType } : {}),
        },
        include: { ratePlans: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        take: 80,
      });

      const offers: SupplierOffer[] = [];
      for (const p of products) {
        const hay = `${p.name} ${p.city || ""} ${p.code || ""} ${p.description || ""}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        if (city && !(p.city || "").toLowerCase().includes(city) && !hay.includes(city)) continue;
        const rate = pickRateForDate(p.ratePlans, input.checkIn);
        if (!rate) continue;
        offers.push({
          offerId: `own:${p.id}:${rate.id}`,
          connectorCode: "own-list",
          connectorName: "Listino proprio",
          serviceType: p.type,
          title: `${p.name}${rate.name ? ` · ${rate.name}` : ""}`,
          city: p.city,
          currency: rate.currency || "EUR",
          netCost: rate.netCost,
          sellPrice: rate.sellPrice,
          priceSource: "OWN_LIST",
          supplierCode: p.supplierCode || "OWN",
          supplierRef: p.supplierRef || p.code || p.id,
          productId: p.id,
          ratePlanId: rate.id,
          notes: rate.cancellationPolicy || undefined,
        });
      }
      return offers.slice(0, 40);
    },
  };
}
