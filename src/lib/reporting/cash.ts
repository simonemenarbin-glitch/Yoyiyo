import type { CashDeadlineKind } from "@prisma/client";

/** Suggest deposit + balance deadlines from a confirmed practice. */
export function suggestCashDeadlines(practice: {
  id: string;
  organizationId: string;
  title: string;
  reference: string;
  totalSell: number;
  depositAmount: number;
  depositPct: number;
  groupageOver20: boolean;
  departureDate: Date | null;
  confirmedAt: Date | null;
}): {
  kind: CashDeadlineKind;
  label: string;
  dueDate: Date;
  amount: number;
  notes?: string;
}[] {
  const out: {
    kind: CashDeadlineKind;
    label: string;
    dueDate: Date;
    amount: number;
    notes?: string;
  }[] = [];

  const deposit =
    practice.depositAmount > 0
      ? practice.depositAmount
      : practice.groupageOver20
        ? Math.round(practice.totalSell * 0.1)
        : Math.round(practice.totalSell * 0.3);

  const confirmBase = practice.confirmedAt || new Date();
  out.push({
    kind: "DEPOSIT",
    label: `Acconto ${practice.reference}`,
    dueDate: new Date(confirmBase.getTime() + 3 * 24 * 60 * 60 * 1000),
    amount: deposit,
    notes: practice.groupageOver20 ? "Groupage 10%" : "FIT acconto standard",
  });

  const balance = Math.max(0, Math.round((practice.totalSell - deposit) * 100) / 100);
  if (practice.departureDate && balance > 0) {
    const due = new Date(practice.departureDate);
    due.setDate(due.getDate() - (practice.groupageOver20 ? 45 : 30));
    out.push({
      kind: "BALANCE",
      label: `Saldo ${practice.reference}`,
      dueDate: due,
      amount: balance,
    });
  }

  // Supplier pay rough: 50% of cost-side approx as sell*0.7 21d before
  if (practice.departureDate) {
    const supplierDue = new Date(practice.departureDate);
    supplierDue.setDate(supplierDue.getDate() - 21);
    out.push({
      kind: "SUPPLIER_PAY",
      label: `Pagamento fornitori ${practice.reference}`,
      dueDate: supplierDue,
      amount: Math.round(practice.totalSell * 0.7),
      notes: "Stima cassa uscita (70% del venduto)",
    });
  }

  return out;
}

export function refreshOverdueStatus<T extends { dueDate: Date; status: string; paidAt?: Date | null }>(
  rows: T[],
  asOf: Date = new Date(),
): T[] {
  return rows.map((r) => {
    if (r.status === "PAID" || r.status === "WAIVED") return r;
    if (r.dueDate.getTime() < asOf.getTime()) {
      return { ...r, status: "OVERDUE" };
    }
    return r;
  });
}
