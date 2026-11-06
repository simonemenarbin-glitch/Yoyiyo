import type { CatalogProduct, Lead, ProductType, RatePlan } from "@prisma/client";
import { recalcQuoteTotals } from "@/lib/quote-math";

type ProductWithRate = CatalogProduct & { ratePlans: RatePlan[] };

const CITY_HINTS: Record<string, string[]> = {
  Pechino: ["pechino", "beijing", "dongzhimen", "pek"],
  Shanghai: ["shanghai", "bund"],
  "Xi'an": ["xi'an", "xian", "terracotta"],
  Chengdu: ["chengdu", "panda", "dorsett"],
  Chongqing: ["chongqing", "yangtze"],
  Zhangjiajie: ["zhangjiajie"],
  Guilin: ["guilin", "riverview"],
  Yangshuo: ["yangshuo"],
  Cina: ["cina", "china", "pechino", "shanghai"],
};

function scoreProduct(product: CatalogProduct, destinations: string[], interest: string) {
  const hay = `${product.name} ${product.city || ""} ${product.code || ""} ${product.description || ""}`.toLowerCase();
  let score = 0;
  for (const dest of destinations) {
    const hints = CITY_HINTS[dest] || [dest.toLowerCase()];
    if (hints.some((h) => hay.includes(h))) score += 3;
    if ((product.city || "").toLowerCase().includes(dest.toLowerCase())) score += 2;
  }
  if (interest) {
    const tokens = interest.toLowerCase().split(/[^a-zà-ü0-9]+/).filter((t) => t.length > 3);
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
  }
  if (product.priceSource === "OWN_LIST") score += 0.5;
  if (product.priceSource === "SUPPLIER_API" && product.active) score += 0.25;
  return score;
}

export function pickCatalogLines(input: {
  products: ProductWithRate[];
  destinations: string[];
  interest: string | null;
  paxCount: number;
  durationDays: number | null;
}) {
  const interest = input.interest || "";
  const ranked = input.products
    .filter((p) => p.active || p.priceSource === "SUPPLIER_API")
    .map((p) => ({ product: p, score: scoreProduct(p, input.destinations, interest) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked: ProductWithRate[] = [];
  const seenTypes = new Set<ProductType>();

  for (const row of ranked) {
    if (picked.length >= 6) break;
    // prefer diversity of service types for a base land
    if (seenTypes.has(row.product.type) && picked.length >= 3) continue;
    picked.push(row.product);
    seenTypes.add(row.product.type);
  }

  // Fallback: top own-list hotels/transfers if nothing matched
  if (picked.length === 0) {
    picked.push(
      ...input.products
        .filter((p) => p.active && p.priceSource === "OWN_LIST")
        .slice(0, 3),
    );
  }

  const nights = Math.max(1, (input.durationDays || 8) - 1);
  const lines = picked.map((product) => {
    const rate = product.ratePlans[0];
    const isHotel = product.type === "HOTEL";
    const quantity = isHotel ? Math.min(nights, 4) : product.type === "TRANSFER" ? 1 : 1;
    const paxFactor = product.type === "OTHER" || product.type === "FLIGHT" ? input.paxCount : 1;
    return {
      productId: product.id,
      serviceType: product.type,
      title: product.name,
      quantity: quantity * (isHotel ? 1 : paxFactor > 1 && product.type === "OTHER" ? paxFactor : 1),
      netCost: rate?.netCost ?? 0,
      unitPrice: rate?.sellPrice ?? 0,
      priceSource: product.priceSource,
      supplierCode: product.supplierCode,
      supplierRef: product.supplierRef,
      notes:
        product.priceSource === "SUPPLIER_API"
          ? "Slot API fornitore — tariffa da confermare a live quote"
          : undefined,
    };
  });

  return { lines, totals: recalcQuoteTotals(lines) };
}

export function quoteTitleFromLead(lead: Pick<Lead, "interest" | "firstName" | "lastName">) {
  return lead.interest?.trim() || `Preventivo base ${lead.firstName} ${lead.lastName}`;
}
