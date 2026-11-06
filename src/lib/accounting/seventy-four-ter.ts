/**
 * Regime IVA speciale agenzie di viaggio — art. 74-ter DPR 633/72.
 * L'imposta si calcola sul margine (corrispettivi − costi dei servizi viaggio),
 * non sull'intero corrispettivo al cliente.
 */

export type SeventyFourTerInput = {
  totalSell: number;
  totalCost: number;
  vatRate?: number;
};

export type SeventyFourTerResult = {
  totalSell: number;
  totalCost: number;
  marginBase: number;
  vatRate: number;
  vatAmount: number;
  /** IVA inclusa nel margine (metodo del margine lordo tipico 74-ter). */
  marginNetOfVat: number;
  explanation: string;
};

/**
 * Metodo del margine: il corrispettivo include già l'IVA sul margine.
 * Base imponibile = margine / (1 + aliquota); IVA = margine − base.
 * Se sell < cost → margine 0, IVA 0.
 */
export function computeSeventyFourTer(input: SeventyFourTerInput): SeventyFourTerResult {
  const vatRate = input.vatRate ?? 22;
  const totalSell = round2(input.totalSell);
  const totalCost = round2(input.totalCost);
  const grossMargin = Math.max(0, round2(totalSell - totalCost));
  const divisor = 1 + vatRate / 100;
  const marginBase = round2(grossMargin / divisor);
  const vatAmount = round2(grossMargin - marginBase);

  return {
    totalSell,
    totalCost,
    marginBase,
    vatRate,
    vatAmount,
    marginNetOfVat: marginBase,
    explanation:
      grossMargin <= 0
        ? "Margine nullo o negativo: nessuna IVA 74-ter."
        : `Margine lordo ${grossMargin} € → imponibile ${marginBase} € + IVA ${vatRate}% = ${vatAmount} €.`,
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function nextFiscalNumber(year: number, seq: number) {
  return `FT74-${year}-${String(seq).padStart(4, "0")}`;
}

/** SDI stub payload — never calls real SdI. */
export function buildSdiStubPayload(doc: {
  number: string;
  customerVat?: string | null;
  customerName: string;
  marginBase: number;
  vatAmount: number;
  vatRate: number;
}) {
  return {
    stub: true,
    channel: "SdI-demo",
    formato: "FPR12",
    numero: doc.number,
    cedente: "YOYIYO-DEMO",
    cessionario: {
      denominazione: doc.customerName,
      idFiscaleIVA: doc.customerVat || null,
    },
    riepilogo74ter: {
      imponibile: doc.marginBase,
      aliquota: doc.vatRate,
      imposta: doc.vatAmount,
      natura: "N5", // tipica esposizione regime del margine in XML (indicativa)
    },
    warning: "Stub offline — nessun invio al Sistema di Interscambio",
  };
}
