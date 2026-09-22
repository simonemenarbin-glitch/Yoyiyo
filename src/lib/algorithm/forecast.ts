import { jetLagDaysToRecover, jetLagRecoveryAtDay, travelerEnergy } from './energy';
import { isSlotFree, scoreAssignment } from './temporalFit';
import type {
  Assignment,
  DayForecast,
  Destination,
  Experience,
  TravelDna,
  TripForecast,
  TripInput,
} from '../types';

function datePlusDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function tripDayCount(trip: TripInput): number {
  const start = new Date(`${trip.startDate}T12:00:00Z`).getTime();
  const end = new Date(`${trip.endDate}T12:00:00Z`).getTime();
  const days = Math.round((end - start) / 86_400_000) + 1;
  return Math.max(1, Math.min(days, 14));
}

function candidateHours(exp: Experience): number[] {
  const peak = exp.window.peakHour;
  const raw = [peak - 2, peak - 1, peak - 0.5, peak, peak + 0.5, peak + 1, peak + 1.5];
  return [...new Set(raw.map((h) => Math.round(h * 2) / 2))].filter(
    (h) => h >= 7 && h + exp.durationHours <= 23,
  );
}

/**
 * Core Yoyiyo optimizer: assigns experiences to slots maximizing Temporal Fit
 * while surfacing drift risk and energy collapse warnings.
 */
export function buildTripForecast(
  destination: Destination,
  trip: TripInput,
  dna: TravelDna,
): TripForecast {
  const dayCount = tripDayCount(trip);
  const experiences = rankExperiences(destination.experiences, dna);

  const dayOccupied: { start: number; end: number }[][] = Array.from(
    { length: dayCount },
    () => [],
  );
  const dayWalk: number[] = Array.from({ length: dayCount }, () => 0);
  const dayDecision: number[] = Array.from({ length: dayCount }, () => 0);
  const dayAssignments: Assignment[][] = Array.from({ length: dayCount }, () => []);

  // Arrival day: block hours before arrival
  dayOccupied[0].push({ start: 0, end: Math.max(trip.arrivalHourLocal, 7) });

  for (const exp of experiences) {
    let best: {
      day: number;
      hour: number;
      score: ReturnType<typeof scoreAssignment>;
    } | null = null;

    for (let day = 0; day < dayCount; day++) {
      // Don't overload a single day beyond pace capacity
      const maxStops =
        dna.pace === 'slow' ? 3 : dna.pace === 'balanced' ? 4 : 5;
      if (dayAssignments[day].length >= maxStops) continue;

      for (const hour of candidateHours(exp)) {
        if (!isSlotFree(hour, exp.durationHours, dayOccupied[day])) continue;

        const score = scoreAssignment({
          exp,
          slot: {
            dayIndex: day,
            startHour: hour,
            endHour: hour + exp.durationHours,
          },
          dna,
          trip,
          cumulativeWalkingKm: dayWalk[day],
          decisionLoadSoFar: dayDecision[day],
        });

        if (!best || score.total > best.score.total) {
          best = { day, hour, score };
        }
      }
    }

    if (!best || best.score.total < 38) continue;

    const assignment: Assignment = {
      experience: exp,
      slot: {
        dayIndex: best.day,
        startHour: best.hour,
        endHour: best.hour + exp.durationHours,
      },
      score: best.score,
    };

    dayAssignments[best.day].push(assignment);
    dayOccupied[best.day].push({
      start: best.hour,
      end: best.hour + exp.durationHours,
    });
    dayWalk[best.day] += exp.walkingCostKm;
    dayDecision[best.day] += exp.decisionLoad;
  }

  // Sort assignments within each day
  for (const list of dayAssignments) {
    list.sort((a, b) => a.slot.startHour - b.slot.startHour);
  }

  const days: DayForecast[] = [];
  for (let day = 0; day < dayCount; day++) {
    const energyCurve = [];
    for (let hour = 7; hour <= 22; hour++) {
      energyCurve.push({
        hour,
        energy: travelerEnergy({
          hourLocal: hour,
          dayIndex: day,
          chronotype: dna.chronotype,
          homeOffset: trip.homeTimezoneOffset,
          destOffset: trip.destinationTimezoneOffset,
          cumulativeWalkingKm: dayWalk[day] * ((hour - 7) / 15),
          walkingCapacityKm: dna.walkingKmPerDay,
          decisionLoadSoFar: dayDecision[day] * ((hour - 7) / 15),
          fatigueSensitivity: dna.decisionFatigueSensitivity,
        }),
      });
    }

    const warnings: string[] = [];
    const recovery = jetLagRecoveryAtDay(
      day,
      trip.homeTimezoneOffset,
      trip.destinationTimezoneOffset,
    );
    if (recovery < 0.55) {
      warnings.push(
        'Jet lag still active — protect mornings and avoid high decision-load museums.',
      );
    }
    const risky = dayAssignments[day].filter((a) => a.score.driftRisk >= 0.55);
    for (const a of risky) {
      warnings.push(
        `High drift risk on ${a.experience.name} (${Math.round(a.score.driftRisk * 100)}%) — keep a buffer or move it.`,
      );
    }
    if (dayWalk[day] > dna.walkingKmPerDay * 1.1) {
      warnings.push('Walking load exceeds your comfortable daily range.');
    }
    const afternoonDip = energyCurve.find((e) => e.hour === 15);
    if (afternoonDip && afternoonDip.energy < 0.35) {
      warnings.push('Energy collapse likely mid-afternoon — schedule a rest slot.');
    }

    days.push({
      dayIndex: day,
      date: datePlusDays(trip.startDate, day),
      energyCurve,
      assignments: dayAssignments[day],
      warnings,
      jetLagRecovery: Math.round(recovery * 100) / 100,
    });
  }

  const { headline, insight } = buildNarrative(destination, trip, dna, days);

  return { destination, trip, dna, days, headline, insight };
}

function rankExperiences(experiences: Experience[], dna: TravelDna): Experience[] {
  return [...experiences].sort((a, b) => {
    const pa = priorityBoost(a, dna) * a.regretWeight;
    const pb = priorityBoost(b, dna) * b.regretWeight;
    return pb - pa;
  });
}

function priorityBoost(exp: Experience, dna: TravelDna): number {
  const hits = exp.priorityTags.filter((t) => dna.priorities.includes(t)).length;
  return 1 + hits * 0.35;
}

function buildNarrative(
  destination: Destination,
  trip: TripInput,
  dna: TravelDna,
  days: DayForecast[],
): { headline: string; insight: string } {
  const jet = jetLagDaysToRecover(
    trip.homeTimezoneOffset,
    trip.destinationTimezoneOffset,
  );
  const top = days
    .flatMap((d) => d.assignments)
    .sort((a, b) => b.score.total - a.score.total)[0];

  const headline = top
    ? `Your Kairos moment in ${destination.name}: ${top.experience.name}`
    : `Your ${destination.name} rhythm is ready`;

  const chrono =
    dna.chronotype === 'lark'
      ? 'early light'
      : dna.chronotype === 'owl'
        ? 'late glow'
        : 'midday clarity';

  const jetLine =
    jet.days > 0.5
      ? ` Flying ${jet.direction} across ${jet.hoursShifted}h means ~${jet.days.toFixed(1)} days of adaptation — day 1 stays light on purpose.`
      : ' Minimal timezone shift, so we optimize pure place-quality windows.';

  const insight = `Yoyiyo timed your trip around ${chrono}.${jetLine} High-regret stops are locked to your Temporal Fit peaks; fragile ones carry a drift warning so you can leave intentional white space.`;

  return { headline, insight };
}
