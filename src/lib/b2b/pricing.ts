import { roundSellTens } from "@/lib/suppliers/pricing";

/** Agency net from TO cost with net-specific commission retained by TO. */
export function agencyNetFromCost(netCost: number, toCommissionPct: number) {
  const agencyNet = netCost * (1 + toCommissionPct / 100);
  return Math.round(agencyNet * 100) / 100;
}

/** Suggested B2C sell for partner counter from agency net + partner markup. */
export function suggestedSellFromAgencyNet(agencyNet: number, partnerMarkupPct: number) {
  return roundSellTens(agencyNet * (1 + partnerMarkupPct / 100));
}

export function buildPartnerLinePrices(opts: {
  netCost: number;
  toCommissionPct: number;
  partnerMarkupPct: number;
}) {
  const agencyNet = agencyNetFromCost(opts.netCost, opts.toCommissionPct);
  const suggestedSell = suggestedSellFromAgencyNet(agencyNet, opts.partnerMarkupPct);
  const toMargin = agencyNet - opts.netCost;
  const partnerMargin = suggestedSell - agencyNet;
  return { agencyNet, suggestedSell, toMargin, partnerMargin };
}

/** Prefer partner-specific list, else net list, else empty. */
export function pickPartnerLists<T extends { partnerId: string | null; netId: string | null; active: boolean }>(
  lists: T[],
  opts: { partnerId: string; netId?: string | null },
): T[] {
  const active = lists.filter((l) => l.active);
  const forPartner = active.filter((l) => l.partnerId === opts.partnerId);
  if (forPartner.length) return forPartner;
  if (opts.netId) {
    const forNet = active.filter((l) => l.netId === opts.netId && !l.partnerId);
    if (forNet.length) return forNet;
  }
  return active.filter((l) => !l.partnerId && !l.netId);
}

export function randomPortalToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "prt_";
  for (let i = 0; i < 24; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
