import type { PrismaClient } from "@prisma/client";
import { resolveTariff, sumSupplements } from "@/lib/catalog/pricing";
import type { SupplierAdapter, SupplierOffer, SupplierSearchInput } from "./types";

export function createOwnListAdapter(prisma: PrismaClient): SupplierAdapter {
  return {
    code: "own-list",
    name: "Listino proprio",
    capabilities: {
      search: true,
      quote: false,
      book: false,
      cancel: false,
      liveCredentialsRequired: false,
      sandbox: false,
    },
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
        include: {
          ratePlans: { orderBy: { createdAt: "asc" } },
          periods: { where: { active: true }, orderBy: { validFrom: "asc" } },
          supplements: { where: { active: true } },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        take: 80,
      });

      const offers: SupplierOffer[] = [];
      for (const p of products) {
        const hay = `${p.name} ${p.city || ""} ${p.code || ""} ${p.description || ""}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        if (city && !(p.city || "").toLowerCase().includes(city) && !hay.includes(city)) continue;
        const tariff = resolveTariff({
          ratePlans: p.ratePlans,
          periods: p.periods,
          checkIn: input.checkIn,
        });
        if (tariff.source === "NONE") continue;

        const nights =
          input.checkIn && input.checkOut
            ? Math.max(
                1,
                Math.round(
                  (input.checkOut.getTime() - input.checkIn.getTime()) / (24 * 60 * 60 * 1000),
                ),
              )
            : 1;
        const supp = sumSupplements(p.supplements, {
          checkIn: input.checkIn,
          periodId: tariff.periodId || null,
          baseSell: tariff.sellPrice,
          nights,
          pax: input.paxCount || 1,
        });

        const label =
          tariff.source === "PERIOD"
            ? `${p.name} · ${tariff.label}`
            : `${p.name}${tariff.label ? ` · ${tariff.label}` : ""}`;

        offers.push({
          offerId: `own:${p.id}:${tariff.periodId || tariff.ratePlanId || "base"}`,
          connectorCode: "own-list",
          connectorName: "Listino proprio",
          serviceType: p.type,
          title: label,
          city: p.city,
          currency: tariff.currency || "EUR",
          netCost: tariff.netCost,
          sellPrice: tariff.sellPrice + supp.total,
          priceSource: "OWN_LIST",
          supplierCode: p.supplierCode || "OWN",
          supplierRef: p.supplierRef || p.code || p.id,
          productId: p.id,
          ratePlanId: tariff.ratePlanId || null,
          notes:
            supp.lines.length > 0
              ? `Incl. supplementi: ${supp.lines.map((l) => l.name).join(", ")}`
              : undefined,
          raw: {
            tariffSource: tariff.source,
            periodId: tariff.periodId,
            supplements: supp.lines,
            minStay: tariff.minStay,
          },
        });
      }
      return offers.slice(0, 40);
    },
  };
}
