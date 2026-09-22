import { clamp, gaussian, travelerEnergy } from './energy';
import type {
  Assignment,
  CrowdTolerance,
  Experience,
  TemporalFitBreakdown,
  TimeSlot,
  TravelDna,
  TripInput,
} from '../types';

const WEIGHTS = {
  energy: 0.28,
  placeQuality: 0.22,
  chronotype: 0.12,
  crowd: 0.12,
  light: 0.1,
  regret: 0.16,
} as const;

/** Place quality at a given local hour (bell around peak). */
export function placeQualityAtHour(exp: Experience, hour: number): number {
  return gaussian(hour, exp.window.peakHour, exp.window.peakWidth);
}

export function lightQuality(exp: Experience, hour: number): number {
  switch (exp.window.lightAffinity) {
    case 'dawn':
      return gaussian(hour, 7, 1.4);
    case 'golden':
      return Math.max(gaussian(hour, 18.5, 1.2), gaussian(hour, 7.2, 1));
    case 'night':
      return hour >= 19 || hour <= 1 ? 0.95 : gaussian(hour, 20.5, 2.5) * 0.7;
    case 'day':
    default:
      return hour >= 9 && hour <= 17 ? 0.85 : 0.45;
  }
}

export function crowdFit(
  exp: Experience,
  hour: number,
  tolerance: CrowdTolerance,
): number {
  // Approximate crowd as peaking near place peak, tapering with distance
  const proximity = placeQualityAtHour(exp, hour);
  const crowd = clamp(exp.window.crowdAtPeak * proximity, 0, 1);

  if (tolerance === 'avoid') return 1 - crowd;
  if (tolerance === 'seek') return 0.35 + crowd * 0.65;
  return 1 - Math.abs(crowd - 0.45) * 0.8;
}

export function chronotypeSlotMatch(
  hour: number,
  dna: TravelDna,
  exp: Experience,
): number {
  const energy = travelerEnergy({
    hourLocal: hour,
    dayIndex: 0,
    chronotype: dna.chronotype,
    homeOffset: 0,
    destOffset: 0,
    cumulativeWalkingKm: 0,
    walkingCapacityKm: dna.walkingKmPerDay,
    decisionLoadSoFar: 0,
    fatigueSensitivity: dna.decisionFatigueSensitivity,
  });

  // Night experiences need owl-ish energy
  if (exp.window.lightAffinity === 'night') {
    return dna.chronotype === 'owl' ? 0.95 : dna.chronotype === 'lark' ? 0.35 : 0.65;
  }
  if (exp.window.lightAffinity === 'dawn') {
    return dna.chronotype === 'lark' ? 0.95 : dna.chronotype === 'owl' ? 0.3 : 0.7;
  }
  return energy;
}

/**
 * Probability the traveler abandons this stop if scheduled in this slot.
 * Unique to Yoyiyo: drift risk, not just ranking.
 */
export function driftRisk(opts: {
  exp: Experience;
  hour: number;
  energy: number;
  decisionLoadSoFar: number;
  dna: TravelDna;
}): number {
  const energyGap = clamp(opts.exp.decisionLoad + 0.25 - opts.energy, 0, 1);
  const overload =
    (opts.decisionLoadSoFar + opts.exp.decisionLoad) *
    opts.dna.decisionFatigueSensitivity;
  const pacePenalty =
    opts.dna.pace === 'slow' && opts.exp.walkingCostKm > 2
      ? 0.2
      : opts.dna.pace === 'intense'
        ? -0.05
        : 0;
  const priorityBoost = opts.exp.priorityTags.some((t) =>
    opts.dna.priorities.includes(t),
  )
    ? -0.12
    : 0.08;

  return clamp(0.15 + energyGap * 0.45 + overload * 0.35 + pacePenalty + priorityBoost, 0.02, 0.92);
}

export function scoreAssignment(opts: {
  exp: Experience;
  slot: TimeSlot;
  dna: TravelDna;
  trip: TripInput;
  cumulativeWalkingKm: number;
  decisionLoadSoFar: number;
}): TemporalFitBreakdown {
  const midHour = (opts.slot.startHour + opts.slot.endHour) / 2;
  const energy = travelerEnergy({
    hourLocal: midHour,
    dayIndex: opts.slot.dayIndex,
    chronotype: opts.dna.chronotype,
    homeOffset: opts.trip.homeTimezoneOffset,
    destOffset: opts.trip.destinationTimezoneOffset,
    cumulativeWalkingKm: opts.cumulativeWalkingKm,
    walkingCapacityKm: opts.dna.walkingKmPerDay,
    decisionLoadSoFar: opts.decisionLoadSoFar,
    fatigueSensitivity: opts.dna.decisionFatigueSensitivity,
  });

  const placeQuality = placeQualityAtHour(opts.exp, midHour);
  const chronotypeMatch = chronotypeSlotMatch(midHour, opts.dna, opts.exp);
  const crowd = crowdFit(opts.exp, midHour, opts.dna.crowdTolerance);
  const light = lightQuality(opts.exp, midHour);
  const priorityHit = opts.exp.priorityTags.some((t) =>
    opts.dna.priorities.includes(t),
  )
    ? 1
    : 0.45;
  const regretProtected = opts.exp.regretWeight * priorityHit;
  const drift = driftRisk({
    exp: opts.exp,
    hour: midHour,
    energy,
    decisionLoadSoFar: opts.decisionLoadSoFar,
    dna: opts.dna,
  });

  const energyAlignment = energy * (1 - drift * 0.35);

  const total =
    100 *
    (WEIGHTS.energy * energyAlignment +
      WEIGHTS.placeQuality * placeQuality +
      WEIGHTS.chronotype * chronotypeMatch +
      WEIGHTS.crowd * crowd +
      WEIGHTS.light * light +
      WEIGHTS.regret * regretProtected *
        (1 - drift));

  return {
    total: Math.round(clamp(total, 0, 100)),
    energyAlignment: round2(energyAlignment),
    placeQuality: round2(placeQuality),
    chronotypeMatch: round2(chronotypeMatch),
    crowdFit: round2(crowd),
    lightQuality: round2(light),
    regretProtected: round2(regretProtected),
    driftRisk: round2(drift),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isSlotFree(
  start: number,
  duration: number,
  occupied: { start: number; end: number }[],
): boolean {
  const end = start + duration;
  if (start < 7 || end > 23) return false;
  return occupied.every((o) => end <= o.start + 0.01 || start >= o.end - 0.01);
}

export type ScoredCandidate = Assignment;
