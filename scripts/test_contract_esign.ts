/**
 * Offline tests for contract HTML + sign token helpers.
 * Run: npx tsx scripts/test_contract_esign.ts
 */
import assert from "node:assert/strict";
import {
  buildContractHtml,
  contractStatusLabel,
  newSignToken,
} from "../src/lib/practices/contract";
import type { Practice, PracticeLine, Brand, Customer } from "@prisma/client";

const practice = {
  id: "p1",
  organizationId: "o1",
  brandId: "b1",
  customerId: "c1",
  partnerId: null,
  reference: "PRA-TEST-1",
  title: "Cina Classic",
  status: "CONFIRMED",
  channel: "B2B",
  departureDate: new Date("2026-09-10"),
  returnDate: new Date("2026-09-21"),
  paxCount: 2,
  groupageOver20: false,
  depositPct: 0,
  depositAmount: 0,
  releaseDays: 120,
  confirmedAt: new Date(),
  currency: "EUR",
  totalSell: 1200,
  totalCost: 900,
  marginPct: 25,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  brand: {
    id: "b1",
    name: "Yoyiyo",
  } as Brand,
  customer: {
    id: "c1",
    firstName: "Laura",
    lastName: "Bianchi",
  } as Customer,
  partner: null,
  lines: [
    {
      id: "l1",
      practiceId: "p1",
      title: "Hotel Pechino",
      serviceType: "HOTEL",
      quantity: 3,
      sellPrice: 100,
      netCost: 80,
    } as PracticeLine,
  ],
  quotes: [{ number: "QT-1" }],
} as unknown as Practice & {
  brand: Brand;
  customer: Customer;
  partner: null;
  lines: PracticeLine[];
  quotes: { number: string }[];
};

const built = buildContractHtml(practice, {
  signerName: "Laura Bianchi",
  quoteNumber: "QT-1",
});
assert.ok(built.title.includes("PRA-TEST-1"));
assert.ok(built.bodyHtml.includes("CONTRATTO"));
assert.ok(built.bodyHtml.includes("#B33A2B"));
assert.ok(built.bodyHtml.includes("Laura Bianchi") || built.bodyHtml.includes("Bianchi"));
assert.ok(built.bodyHtml.includes("QT-1"));

const t1 = newSignToken();
const t2 = newSignToken();
assert.ok(t1.startsWith("sgn_"));
assert.notEqual(t1, t2);
assert.equal(contractStatusLabel.SIGNED, "Firmato");

console.log("OK contract-esign", { title: built.title, tokenSample: t1 });
