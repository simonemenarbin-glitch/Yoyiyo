export type PracticeMarginRow = {
  id: string;
  reference: string;
  title: string;
  status: string;
  brandId: string | null;
  brandName: string | null;
  channel: string;
  totalSell: number;
  totalCost: number;
  marginPct: number;
  marginAbs: number;
};

export function marginAbs(sell: number, cost: number) {
  return Math.round((sell - cost) * 100) / 100;
}

export function marginPct(sell: number, cost: number) {
  if (sell <= 0) return 0;
  return Math.round(((sell - cost) / sell) * 1000) / 10;
}

export function aggregateByBrand(rows: PracticeMarginRow[]) {
  const map = new Map<
    string,
    { brandId: string | null; brandName: string; sell: number; cost: number; count: number }
  >();
  for (const r of rows) {
    const key = r.brandId || "_none";
    const cur = map.get(key) || {
      brandId: r.brandId,
      brandName: r.brandName || "Senza marchio",
      sell: 0,
      cost: 0,
      count: 0,
    };
    cur.sell += r.totalSell;
    cur.cost += r.totalCost;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((b) => ({
      ...b,
      marginAbs: marginAbs(b.sell, b.cost),
      marginPct: marginPct(b.sell, b.cost),
    }))
    .sort((a, b) => b.sell - a.sell);
}

export function aggregateByChannel(rows: PracticeMarginRow[]) {
  const map = new Map<string, { channel: string; sell: number; cost: number; count: number }>();
  for (const r of rows) {
    const cur = map.get(r.channel) || { channel: r.channel, sell: 0, cost: 0, count: 0 };
    cur.sell += r.totalSell;
    cur.cost += r.totalCost;
    cur.count += 1;
    map.set(r.channel, cur);
  }
  return [...map.values()]
    .map((c) => ({
      ...c,
      marginAbs: marginAbs(c.sell, c.cost),
      marginPct: marginPct(c.sell, c.cost),
    }))
    .sort((a, b) => b.sell - a.sell);
}
