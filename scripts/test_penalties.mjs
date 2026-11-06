#!/usr/bin/env node
/**
 * Smoke tests for Yoyiyo FIT / groupage cancellation penalty rules.
 * Run: npm run test:penalties
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("tsx/cjs");
const {
  computeCancellationPenalty,
  penaltyBandForDays,
  suggestedDeposit,
} = require("../src/lib/practices/penalties.ts");

function daysFromNow(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(e);
  }
}

check("band >30 → 15%", () => {
  assert.equal(penaltyBandForDays(45).pct, 15);
});
check("band 25 → 30%", () => {
  assert.equal(penaltyBandForDays(25).pct, 30);
});
check("band 15 → 50%", () => {
  assert.equal(penaltyBandForDays(15).pct, 50);
});
check("band 5 → 75%", () => {
  assert.equal(penaltyBandForDays(5).pct, 75);
});
check("band 1 → 100%", () => {
  assert.equal(penaltyBandForDays(1).pct, 100);
});

check("groupage before release → deposit refundable, 0 penalty", () => {
  const r = computeCancellationPenalty({
    departureDate: daysFromNow(150),
    groupageOver20: true,
    releaseDays: 120,
    cancelledSell: 10000,
    depositAmount: 1000,
  });
  assert.equal(r.band.kind, "DEPOSIT_REFUNDABLE");
  assert.equal(r.penaltyAmount, 0);
  assert.equal(r.beforeRelease, true);
});

check("groupage after release → scale applies", () => {
  const r = computeCancellationPenalty({
    departureDate: daysFromNow(25),
    groupageOver20: true,
    releaseDays: 120,
    confirmedAt: daysFromNow(-30),
    cancelledSell: 10000,
    depositAmount: 1000,
  });
  assert.equal(r.band.kind, "SCALE");
  assert.equal(r.band.pct, 30);
  assert.equal(r.penaltyAmount, 3000);
});

check("FIT unconfirmed → no penalty yet", () => {
  const r = computeCancellationPenalty({
    departureDate: daysFromNow(40),
    groupageOver20: false,
    confirmedAt: null,
    cancelledSell: 5000,
  });
  assert.equal(r.penaltyAmount, 0);
});

check("FIT confirmed >30gg → 15%", () => {
  const r = computeCancellationPenalty({
    departureDate: daysFromNow(40),
    groupageOver20: false,
    confirmedAt: daysFromNow(-10),
    cancelledSell: 5000,
  });
  assert.equal(r.band.pct, 15);
  assert.equal(r.penaltyAmount, 750);
});

check("suggestedDeposit groupage 10%", () => {
  assert.deepEqual(suggestedDeposit(12345, true), { pct: 10, amount: 1235 });
  assert.deepEqual(suggestedDeposit(12345, false), { pct: 0, amount: 0 });
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall penalty tests passed");
