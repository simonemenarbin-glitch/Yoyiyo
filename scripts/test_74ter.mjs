import assert from "node:assert/strict";

function round2(n) {
  return Math.round(n * 100) / 100;
}
function computeSeventyFourTer({ totalSell, totalCost, vatRate = 22 }) {
  const grossMargin = Math.max(0, round2(totalSell - totalCost));
  const divisor = 1 + vatRate / 100;
  const marginBase = round2(grossMargin / divisor);
  const vatAmount = round2(grossMargin - marginBase);
  return { marginBase, vatAmount, grossMargin };
}

const a = computeSeventyFourTer({ totalSell: 1220, totalCost: 1000 });
assert.equal(a.grossMargin, 220);
assert.equal(a.marginBase, 180.33);
assert.equal(a.vatAmount, 39.67);

const zero = computeSeventyFourTer({ totalSell: 100, totalCost: 150 });
assert.equal(zero.vatAmount, 0);

console.log("74-ter tests OK");
