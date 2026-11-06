import type { RatePlan } from "@prisma/client";

/** Round sell price to nearest 10€ (Yoyiyo commercial rule). */
export function roundSellTens(value: number) {
  return Math.round(value / 10) * 10;
}

/** Default land markup on supplier net (+20%). Hotels from OTA stay +5% elsewhere. */
export function sellFromNet(net: number, markupPct = 20) {
  return roundSellTens(net * (1 + markupPct / 100));
}

export function pickRateForDate(
  rates: RatePlan[],
  when: Date | null | undefined,
): RatePlan | null {
  if (!rates.length) return null;
  if (!when) return rates[0];
  const t = when.getTime();
  const inWindow = rates.find((r) => {
    const fromOk = !r.validFrom || r.validFrom.getTime() <= t;
    const toOk = !r.validTo || r.validTo.getTime() >= t;
    return fromOk && toOk;
  });
  return inWindow || rates[0];
}
