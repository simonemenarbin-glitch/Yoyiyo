export function eur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function marginLabel(sell: number, cost: number) {
  if (sell <= 0) return "0%";
  return `${(((sell - cost) / sell) * 100).toFixed(1)}%`;
}
