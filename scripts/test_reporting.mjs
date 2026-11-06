import assert from "node:assert/strict";

function marginAbs(sell, cost) {
  return Math.round((sell - cost) * 100) / 100;
}
function marginPct(sell, cost) {
  if (sell <= 0) return 0;
  return Math.round(((sell - cost) / sell) * 1000) / 10;
}
function aggregateByBrand(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = r.brandId || "_none";
    const cur = map.get(key) || { brandId: r.brandId, brandName: r.brandName || "Senza", sell: 0, cost: 0 };
    cur.sell += r.totalSell;
    cur.cost += r.totalCost;
    map.set(key, cur);
  }
  return [...map.values()].map((b) => ({ ...b, marginAbs: marginAbs(b.sell, b.cost), marginPct: marginPct(b.sell, b.cost) }));
}

const rows = [
  { brandId: "a", brandName: "Yoyiyo", totalSell: 454, totalCost: 390 },
  { brandId: "b", brandName: "CIG", totalSell: 8800, totalCost: 7040 },
];
const by = aggregateByBrand(rows);
assert.equal(by.length, 2);
assert.equal(by.find((x) => x.brandId === "b").marginAbs, 1760);
assert.equal(marginPct(8800, 7040), 20);

console.log("reporting tests OK");
