/**
 * Offline tests for AR/AP invoice math + numbering.
 * Run: npx tsx scripts/test_accounting_ar_ap.ts
 */
import assert from "node:assert/strict";
import {
  calcSeventyFourTer,
  calcStandardVat,
  deriveInvoiceStatus,
  nextInvoiceNumber,
  sumLines,
} from "../src/lib/accounting/invoices";

const std = calcStandardVat(1000, 22);
assert.equal(std.vatAmount, 220);
assert.equal(std.total, 1220);

const t74 = calcSeventyFourTer({ totalSell: 1000, totalCost: 700, vatRate: 22 });
assert.equal(t74.marginBase, 300);
assert.ok(t74.vatAmount > 0 && t74.vatAmount < 300);
assert.equal(t74.total, 1000);

assert.equal(sumLines([{ description: "a", quantity: 2, unitPrice: 50 }]), 100);

assert.equal(nextInvoiceNumber("AR", [], 2026), "FT-2026-0001");
assert.equal(nextInvoiceNumber("AR", ["FT-2026-0001", "FT-2026-0007"], 2026), "FT-2026-0008");
assert.equal(nextInvoiceNumber("AP", ["FF-2026-0002"], 2026), "FF-2026-0003");

assert.equal(
  deriveInvoiceStatus({
    status: "ISSUED",
    total: 100,
    paidAmount: 100,
  }),
  "PAID",
);
assert.equal(
  deriveInvoiceStatus({
    status: "ISSUED",
    total: 100,
    paidAmount: 40,
  }),
  "PARTIAL",
);
assert.equal(
  deriveInvoiceStatus({
    status: "ISSUED",
    total: 100,
    paidAmount: 0,
    dueDate: new Date(Date.now() - 86400_000),
  }),
  "OVERDUE",
);

console.log("OK accounting-ar-ap", { std, t74 });
