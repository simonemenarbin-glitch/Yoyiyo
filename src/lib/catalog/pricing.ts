import type { AllotmentBucket, ContractPeriod, RatePlan, RateSupplement } from "@prisma/client";

export type PeriodLike = Pick<
  ContractPeriod,
  "id" | "name" | "validFrom" | "validTo" | "netCost" | "sellPrice" | "currency" | "minStay" | "bookableUntil" | "active"
>;

export type SupplementLike = Pick<
  RateSupplement,
  | "id"
  | "name"
  | "kind"
  | "amount"
  | "isPercent"
  | "perNight"
  | "perPerson"
  | "validFrom"
  | "validTo"
  | "active"
  | "periodId"
>;

/** Pick the active contract period for a stay start date (bookableUntil respected). */
export function pickPeriodForDate(
  periods: PeriodLike[],
  when: Date | null | undefined,
  bookAsOf: Date = new Date(),
): PeriodLike | null {
  if (!periods.length) return null;
  const active = periods.filter((p) => p.active);
  if (!when) return active[0] || null;
  const t = when.getTime();
  const bookT = bookAsOf.getTime();
  return (
    active.find((p) => {
      const inWindow = p.validFrom.getTime() <= t && p.validTo.getTime() >= t;
      const bookable = !p.bookableUntil || p.bookableUntil.getTime() >= bookT;
      return inWindow && bookable;
    }) || null
  );
}

/** Resolve sell/net: period wins over rate plan window, else rate plan. */
export function resolveTariff(opts: {
  ratePlans: RatePlan[];
  periods: PeriodLike[];
  checkIn?: Date | null;
  bookAsOf?: Date;
}): {
  source: "PERIOD" | "RATE_PLAN" | "NONE";
  netCost: number;
  sellPrice: number;
  currency: string;
  label: string;
  periodId?: string;
  ratePlanId?: string;
  minStay: number;
} {
  const period = pickPeriodForDate(opts.periods, opts.checkIn, opts.bookAsOf);
  if (period) {
    return {
      source: "PERIOD",
      netCost: period.netCost,
      sellPrice: period.sellPrice,
      currency: period.currency || "EUR",
      label: period.name,
      periodId: period.id,
      minStay: period.minStay || 1,
    };
  }

  const rates = opts.ratePlans;
  if (!rates.length) {
    return {
      source: "NONE",
      netCost: 0,
      sellPrice: 0,
      currency: "EUR",
      label: "—",
      minStay: 1,
    };
  }

  const when = opts.checkIn;
  let rate = rates[0];
  if (when) {
    const t = when.getTime();
    rate =
      rates.find((r) => {
        const fromOk = !r.validFrom || r.validFrom.getTime() <= t;
        const toOk = !r.validTo || r.validTo.getTime() >= t;
        return fromOk && toOk;
      }) || rates[0];
  }

  return {
    source: "RATE_PLAN",
    netCost: rate.netCost,
    sellPrice: rate.sellPrice,
    currency: rate.currency || "EUR",
    label: rate.name,
    ratePlanId: rate.id,
    minStay: 1,
  };
}

export function supplementApplies(
  s: SupplementLike,
  opts: { checkIn?: Date | null; periodId?: string | null },
): boolean {
  if (!s.active) return false;
  if (s.periodId && opts.periodId && s.periodId !== opts.periodId) return false;
  if (s.periodId && !opts.periodId) return false;
  const when = opts.checkIn;
  if (when) {
    const t = when.getTime();
    if (s.validFrom && s.validFrom.getTime() > t) return false;
    if (s.validTo && s.validTo.getTime() < t) return false;
  }
  return true;
}

/** Absolute EUR amount for one supplement given nights/pax. */
export function supplementAmountEur(
  s: SupplementLike,
  baseSell: number,
  nights: number,
  pax: number,
): number {
  let unit = s.isPercent ? (baseSell * s.amount) / 100 : s.amount;
  if (s.perNight) unit *= Math.max(1, nights);
  if (s.perPerson) unit *= Math.max(1, pax);
  return Math.round(unit * 100) / 100;
}

export function sumSupplements(
  supplements: SupplementLike[],
  opts: {
    checkIn?: Date | null;
    periodId?: string | null;
    baseSell: number;
    nights?: number;
    pax?: number;
  },
) {
  const nights = opts.nights ?? 1;
  const pax = opts.pax ?? 1;
  const applicable = supplements.filter((s) =>
    supplementApplies(s, { checkIn: opts.checkIn, periodId: opts.periodId }),
  );
  const lines = applicable.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    amount: supplementAmountEur(s, opts.baseSell, nights, pax),
  }));
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total: Math.round(total * 100) / 100 };
}

export type AllotmentLike = Pick<
  AllotmentBucket,
  | "id"
  | "name"
  | "unit"
  | "totalUnits"
  | "releasedUnits"
  | "bookedUnits"
  | "releaseDays"
  | "freeSale"
  | "periodId"
>;

export function allotmentAvailability(
  bucket: AllotmentLike,
  opts?: { checkIn?: Date | null; asOf?: Date },
): {
  available: number;
  status: "OK" | "STOP_SALE" | "FREE_SALE" | "RELEASED";
  remainingContract: number;
} {
  const remainingContract = Math.max(0, bucket.totalUnits - bucket.releasedUnits - bucket.bookedUnits);
  if (bucket.freeSale) {
    return { available: remainingContract || 999, status: "FREE_SALE", remainingContract };
  }

  const asOf = opts?.asOf || new Date();
  const checkIn = opts?.checkIn;
  if (checkIn) {
    const days = Math.floor((checkIn.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000));
    if (days < bucket.releaseDays) {
      // Unsold allotment released → treat as free-sale remnant or stop if zero
      if (remainingContract <= 0) {
        return { available: 0, status: "RELEASED", remainingContract: 0 };
      }
      return { available: remainingContract, status: "RELEASED", remainingContract };
    }
  }

  if (remainingContract <= 0) {
    return { available: 0, status: "STOP_SALE", remainingContract: 0 };
  }
  return { available: remainingContract, status: "OK", remainingContract };
}

export function bookAllotmentUnits(bucket: AllotmentLike, qty: number): AllotmentLike {
  const avail = allotmentAvailability(bucket);
  if (avail.available < qty && !bucket.freeSale) {
    throw new Error(`Allotment insufficiente: richiesti ${qty}, disponibili ${avail.available}`);
  }
  return {
    ...bucket,
    bookedUnits: bucket.bookedUnits + qty,
  };
}
