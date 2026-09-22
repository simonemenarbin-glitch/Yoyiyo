import type { Chronotype } from '../types';

/**
 * Jet-lag recovery model.
 * Rule of thumb refined: ~0.5 day recovery per hour eastbound,
 * ~0.67 day per hour westbound (asymmetric circadian shift).
 */
export function jetLagDaysToRecover(
  homeOffset: number,
  destOffset: number,
): { days: number; direction: 'east' | 'west' | 'none'; hoursShifted: number } {
  let delta = destOffset - homeOffset;
  // Normalize to [-12, 12]
  if (delta > 12) delta -= 24;
  if (delta < -12) delta += 24;

  const hoursShifted = Math.abs(delta);
  if (hoursShifted < 0.5) {
    return { days: 0, direction: 'none', hoursShifted: 0 };
  }

  const eastbound = delta > 0; // destination is ahead = flying east
  const days = eastbound ? hoursShifted * 0.5 : hoursShifted * 0.67;
  return {
    days,
    direction: eastbound ? 'east' : 'west',
    hoursShifted,
  };
}

/** Fraction of circadian adaptation completed by the start of dayIndex (0-based). */
export function jetLagRecoveryAtDay(
  dayIndex: number,
  homeOffset: number,
  destOffset: number,
): number {
  const { days } = jetLagDaysToRecover(homeOffset, destOffset);
  if (days <= 0) return 1;
  // Sigmoid-ish: recovery progresses through the trip days
  const progress = (dayIndex + 0.35) / days;
  return clamp(progress, 0, 1);
}

/**
 * Baseline alertness by local hour for a chronotype (0–1).
 * Larks peak earlier; owls later.
 */
export function chronotypeEnergy(hour: number, chronotype: Chronotype): number {
  const peak =
    chronotype === 'lark' ? 9.5 : chronotype === 'owl' ? 14.5 : 11.5;
  const trough =
    chronotype === 'lark' ? 14.5 : chronotype === 'owl' ? 9 : 15;
  const nightFloor = chronotype === 'owl' ? 0.35 : chronotype === 'lark' ? 0.15 : 0.22;

  // Daytime bell around peak
  const day = gaussian(hour, peak, 3.2);
  // Post-lunch dip
  const dip = gaussian(hour, trough, 1.4) * 0.35;
  // Night suppression
  const nightPenalty = hour < 6 || hour > 22 ? 0.45 : hour > 20 ? 0.2 : 0;

  return clamp(nightFloor + day * 0.75 - dip - nightPenalty, 0.05, 1);
}

/**
 * Combined energy at a local hour on a given trip day,
 * blending home-body clock with destination clock via recovery.
 */
export function travelerEnergy(opts: {
  hourLocal: number;
  dayIndex: number;
  chronotype: Chronotype;
  homeOffset: number;
  destOffset: number;
  cumulativeWalkingKm: number;
  walkingCapacityKm: number;
  decisionLoadSoFar: number;
  fatigueSensitivity: number;
}): number {
  const recovery = jetLagRecoveryAtDay(
    opts.dayIndex,
    opts.homeOffset,
    opts.destOffset,
  );

  const localBody = chronotypeEnergy(opts.hourLocal, opts.chronotype);

  // Unadapted body still runs partly on home time
  const homeHour =
    (opts.hourLocal - (opts.destOffset - opts.homeOffset) + 48) % 24;
  const homeBody = chronotypeEnergy(homeHour, opts.chronotype);

  const circadian = localBody * recovery + homeBody * (1 - recovery);

  const walkRatio = opts.cumulativeWalkingKm / Math.max(opts.walkingCapacityKm, 1);
  const walkFatigue = clamp(walkRatio * 0.35, 0, 0.45);
  const decisionFatigue =
    opts.decisionLoadSoFar * 0.25 * (0.5 + opts.fatigueSensitivity);

  return clamp(circadian - walkFatigue - decisionFatigue, 0.05, 1);
}

export function gaussian(x: number, mean: number, sigma: number): number {
  const z = (x - mean) / sigma;
  return Math.exp(-0.5 * z * z);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
