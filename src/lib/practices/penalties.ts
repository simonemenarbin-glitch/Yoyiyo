/**
 * Penali Yoyiyo / CIG — allineate alle regole operative TO italiane.
 *
 * Groupage >20 pax: acconto 10% rimborsabile fino al release voli (default 120 gg
 * dalla partenza). Dopo il release: scala 15/30/50/75/100 sulla quota annullata.
 *
 * Fino a 20 pax (FIT / piccoli gruppi): dalla conferma, stessa scala (niente
 * acconto 10% / 120 gg salvo diversa indicazione).
 */

export type PenaltyBand =
  | { kind: "DEPOSIT_REFUNDABLE"; pct: 0; label: string }
  | { kind: "SCALE"; pct: 15 | 30 | 50 | 75 | 100; label: string };

export type PenaltyInput = {
  asOf?: Date;
  departureDate: Date | null | undefined;
  groupageOver20: boolean;
  releaseDays?: number;
  confirmedAt?: Date | null;
  /** Quota vendita dei posti/servizi annullati */
  cancelledSell: number;
  depositAmount?: number;
};

export type PenaltyResult = {
  daysToDeparture: number | null;
  beforeRelease: boolean;
  band: PenaltyBand;
  penaltyAmount: number;
  refundableAmount: number;
  explanation: string;
};

export function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function penaltyBandForDays(daysToDeparture: number): PenaltyBand {
  if (daysToDeparture > 30) {
    return { kind: "SCALE", pct: 15, label: "Oltre 30 giorni dalla partenza: penale 15%" };
  }
  if (daysToDeparture >= 21) {
    return { kind: "SCALE", pct: 30, label: "29–21 giorni: penale 30%" };
  }
  if (daysToDeparture >= 11) {
    return { kind: "SCALE", pct: 50, label: "20–11 giorni: penale 50%" };
  }
  if (daysToDeparture >= 3) {
    return { kind: "SCALE", pct: 75, label: "10–3 giorni: penale 75%" };
  }
  return {
    kind: "SCALE",
    pct: 100,
    label: "Da 2 giorni o no-show: penale 100%",
  };
}

export function computeCancellationPenalty(input: PenaltyInput): PenaltyResult {
  const asOf = input.asOf || new Date();
  const releaseDays = input.releaseDays ?? 120;
  const cancelled = Math.max(0, input.cancelledSell);

  if (!input.departureDate) {
    const band: PenaltyBand = {
      kind: "SCALE",
      pct: 100,
      label: "Partenza non impostata: applicare penale solo dopo conferma date",
    };
    return {
      daysToDeparture: null,
      beforeRelease: false,
      band,
      penaltyAmount: 0,
      refundableAmount: cancelled,
      explanation: band.label,
    };
  }

  const days = daysBetween(asOf, input.departureDate);
  const beforeRelease = days > releaseDays;

  if (input.groupageOver20 && beforeRelease) {
    const band: PenaltyBand = {
      kind: "DEPOSIT_REFUNDABLE",
      pct: 0,
      label: `Acconto 10% rimborsabile fino al release voli (${releaseDays} gg dalla partenza)`,
    };
    const deposit = Math.max(0, input.depositAmount ?? cancelled * 0.1);
    return {
      daysToDeparture: days,
      beforeRelease: true,
      band,
      penaltyAmount: 0,
      refundableAmount: cancelled,
      explanation: `${band.label}. Oggi: ${days} gg alla partenza. Acconto tipico € ${deposit.toFixed(0)} (rimborsabile). Assicurazioni/costi fornitore già sostenuti restano esclusi.`,
    };
  }

  // FIT / piccoli gruppi, oppure groupage dopo release
  if (!input.groupageOver20 && !input.confirmedAt) {
    const band: PenaltyBand = {
      kind: "SCALE",
      pct: 15,
      label: "Pratica non ancora confermata: penale standard si applica dalla conferma",
    };
    return {
      daysToDeparture: days,
      beforeRelease,
      band,
      penaltyAmount: 0,
      refundableAmount: cancelled,
      explanation: band.label,
    };
  }

  const band = penaltyBandForDays(days);
  const penaltyAmount = Math.round((cancelled * band.pct) / 100);
  const prefix = input.groupageOver20
    ? `Dopo release (${releaseDays} gg): `
    : "FIT / fino a 20 pax: ";

  return {
    daysToDeparture: days,
    beforeRelease: false,
    band,
    penaltyAmount,
    refundableAmount: Math.max(0, cancelled - penaltyAmount),
    explanation: `${prefix}${band.label}. Base annullata € ${cancelled.toFixed(0)} → penale € ${penaltyAmount}. Restano non rimborsabili assicurazioni emesse e costi fornitori non recuperabili.`,
  };
}

export function suggestedDeposit(totalSell: number, groupageOver20: boolean) {
  if (!groupageOver20) return { pct: 0, amount: 0 };
  return { pct: 10, amount: Math.round(totalSell * 0.1) };
}
