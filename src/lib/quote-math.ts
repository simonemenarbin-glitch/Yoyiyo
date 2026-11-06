export function recalcQuoteTotals(
  lines: { quantity: number; unitPrice: number; netCost: number }[],
) {
  const totalSell = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalCost = lines.reduce((s, l) => s + l.netCost * l.quantity, 0);
  const marginPct = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  return { totalSell, totalCost, marginPct };
}
