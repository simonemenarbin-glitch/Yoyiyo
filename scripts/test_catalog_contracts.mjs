/**
 * Unit checks for catalog period / allotment / supplement math (no DB).
 * Run: node scripts/test_catalog_contracts.mjs
 */
import assert from "node:assert/strict";

function pickPeriodForDate(periods, when, bookAsOf = new Date()) {
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

function allotmentAvailability(bucket, opts = {}) {
  const remainingContract = Math.max(
    0,
    bucket.totalUnits - bucket.releasedUnits - bucket.bookedUnits,
  );
  if (bucket.freeSale) {
    return { available: remainingContract || 999, status: "FREE_SALE", remainingContract };
  }
  const asOf = opts.asOf || new Date();
  const checkIn = opts.checkIn;
  if (checkIn) {
    const days = Math.floor((checkIn.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000));
    if (days < bucket.releaseDays) {
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

function supplementAmountEur(s, baseSell, nights, pax) {
  let unit = s.isPercent ? (baseSell * s.amount) / 100 : s.amount;
  if (s.perNight) unit *= Math.max(1, nights);
  if (s.perPerson) unit *= Math.max(1, pax);
  return Math.round(unit * 100) / 100;
}

const low = {
  id: "low",
  name: "Bassa",
  validFrom: new Date("2026-01-01"),
  validTo: new Date("2026-03-31"),
  netCost: 70,
  sellPrice: 90,
  currency: "EUR",
  minStay: 1,
  bookableUntil: null,
  active: true,
};
const high = {
  id: "high",
  name: "Alta",
  validFrom: new Date("2026-07-01"),
  validTo: new Date("2026-08-31"),
  netCost: 120,
  sellPrice: 150,
  currency: "EUR",
  minStay: 3,
  bookableUntil: new Date("2026-05-01"),
  active: true,
};

assert.equal(pickPeriodForDate([low, high], new Date("2026-07-15"), new Date("2026-04-01"))?.id, "high");
assert.equal(
  pickPeriodForDate([low, high], new Date("2026-07-15"), new Date("2026-06-01")),
  null,
  "expired bookableUntil → no period",
);
assert.equal(pickPeriodForDate([low, high], new Date("2026-02-10"))?.id, "low");

const allot = {
  id: "a1",
  name: "DBL estate",
  unit: "ROOM",
  totalUnits: 10,
  releasedUnits: 0,
  bookedUnits: 3,
  releaseDays: 21,
  freeSale: false,
  periodId: null,
};
assert.equal(allotmentAvailability(allot).available, 7);
assert.equal(allotmentAvailability(allot).status, "OK");

const near = allotmentAvailability(allot, {
  checkIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  asOf: new Date(),
});
assert.equal(near.status, "RELEASED");
assert.equal(near.available, 7);

assert.equal(
  supplementAmountEur({ isPercent: false, amount: 25, perNight: true, perPerson: false }, 100, 3, 2),
  75,
);
assert.equal(
  supplementAmountEur({ isPercent: true, amount: 10, perNight: false, perPerson: true }, 200, 1, 2),
  40,
);

console.log("catalog contracts tests OK");
