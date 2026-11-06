/**
 * Smoke test Travio / Hotelston sandbox adapters.
 * Run: npx tsx scripts/test_supplier_sandbox.ts
 */
import assert from "node:assert/strict";
import { createHotelstonSandboxAdapter } from "../src/lib/suppliers/hotelston-sandbox";
import { createTravioSandboxAdapter } from "../src/lib/suppliers/travio-sandbox";

async function main() {
  const travio = createTravioSandboxAdapter();
  const hotelston = createHotelstonSandboxAdapter();

  assert.equal(travio.capabilities.sandbox, true);
  assert.equal(hotelston.capabilities.book, true);

  const packages = await travio.search({
    organizationId: "demo",
    query: "Pechino",
    paxCount: 2,
    checkIn: new Date("2026-09-10"),
    checkOut: new Date("2026-09-13"),
  });
  assert.ok(packages.length >= 2, "Travio should return Pechino packages");
  assert.ok(packages.every((p) => p.supplierCode === "TRAVIO"));

  const quote = await travio.quote!(packages[0].offerId);
  assert.equal(quote.status, "OK");

  const book = await travio.book!({
    offerId: packages[0].offerId,
    holderName: "Demo Holder",
    paxCount: 2,
  });
  assert.equal(book.status, "CONFIRMED");
  assert.ok(book.bookingRef.startsWith("TV-"));

  const cancel = await travio.cancel!(book.bookingRef);
  assert.equal(cancel.status, "CANCELLED");

  const hotels = await hotelston.search({
    organizationId: "demo",
    query: "Shanghai",
    serviceType: "HOTEL",
    checkIn: new Date("2026-09-10"),
    checkOut: new Date("2026-09-13"),
  });
  assert.ok(hotels.length >= 1);
  assert.ok(hotels[0].board);
  assert.equal(hotels[0].raw?.nights, 3);

  const hBook = await hotelston.book!({
    offerId: hotels[0].offerId,
    holderName: "Hotel Guest",
    paxCount: 2,
  });
  assert.equal(hBook.status, "CONFIRMED");

  // Hotelston ignores non-hotel service types
  const empty = await hotelston.search({
    organizationId: "demo",
    serviceType: "FLIGHT",
  });
  assert.equal(empty.length, 0);

  console.log("supplier sandbox adapters OK", {
    travioOffers: packages.length,
    hotelstonOffers: hotels.length,
    bookingRef: book.bookingRef,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
