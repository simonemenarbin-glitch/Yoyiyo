import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chronotypeEnergy,
  jetLagDaysToRecover,
  jetLagRecoveryAtDay,
} from './energy';
import { driftRisk, placeQualityAtHour, scoreAssignment } from './temporalFit';
import { buildTripForecast } from './forecast';
import { getDestination } from '../destinations';
import type { TravelDna, TripInput } from '../types';

const dna: TravelDna = {
  chronotype: 'lark',
  pace: 'balanced',
  crowdTolerance: 'avoid',
  priorities: ['photo', 'culture', 'food'],
  walkingKmPerDay: 8,
  decisionFatigueSensitivity: 0.55,
};

describe('jet lag model', () => {
  it('treats eastbound recovery as faster than westbound for same hours', () => {
    const east = jetLagDaysToRecover(1, 9); // +8h east
    const west = jetLagDaysToRecover(9, 1); // -8h west
    assert.equal(east.hoursShifted, 8);
    assert.equal(west.hoursShifted, 8);
    assert.ok(east.days < west.days);
  });

  it('recovers over days', () => {
    const early = jetLagRecoveryAtDay(0, 1, 9);
    const later = jetLagRecoveryAtDay(4, 1, 9);
    assert.ok(later > early);
  });
});

describe('chronotype energy', () => {
  it('gives larks higher morning energy than owls', () => {
    assert.ok(chronotypeEnergy(8, 'lark') > chronotypeEnergy(8, 'owl'));
    assert.ok(chronotypeEnergy(21, 'owl') > chronotypeEnergy(21, 'lark'));
  });
});

describe('temporal fit', () => {
  it('scores dawn viewpoint higher at dawn than noon for a lark', () => {
    const dest = getDestination('lisbon')!;
    const exp = dest.experiences.find((e) => e.id === 'lx-miradouro')!;
    const trip: TripInput = {
      destinationId: 'lisbon',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      arrivalHourLocal: 10,
      homeTimezoneOffset: 1,
      destinationTimezoneOffset: 0,
    };

    const dawn = scoreAssignment({
      exp,
      slot: { dayIndex: 1, startHour: 7.5, endHour: 8.5 },
      dna,
      trip,
      cumulativeWalkingKm: 0,
      decisionLoadSoFar: 0,
    });
    const noon = scoreAssignment({
      exp,
      slot: { dayIndex: 1, startHour: 13, endHour: 14 },
      dna,
      trip,
      cumulativeWalkingKm: 0,
      decisionLoadSoFar: 0,
    });

    assert.ok(dawn.total > noon.total);
    assert.ok(placeQualityAtHour(exp, 7.5) > placeQualityAtHour(exp, 13));
  });

  it('raises drift risk when energy is low and decision load is high', () => {
    const dest = getDestination('florence')!;
    const exp = dest.experiences.find((e) => e.id === 'fi-uffizi')!;
    const low = driftRisk({
      exp,
      hour: 15,
      energy: 0.25,
      decisionLoadSoFar: 1.2,
      dna: { ...dna, decisionFatigueSensitivity: 0.9 },
    });
    const high = driftRisk({
      exp,
      hour: 10,
      energy: 0.9,
      decisionLoadSoFar: 0.1,
      dna,
    });
    assert.ok(low > high);
  });
});

describe('forecast builder', () => {
  it('produces a multi-day plan with kairos scores', () => {
    const dest = getDestination('tokyo')!;
    const trip: TripInput = {
      destinationId: 'tokyo',
      startDate: '2026-11-02',
      endDate: '2026-11-05',
      arrivalHourLocal: 15,
      homeTimezoneOffset: 1,
      destinationTimezoneOffset: 9,
    };
    const forecast = buildTripForecast(dest, trip, dna);
    assert.equal(forecast.days.length, 4);
    assert.ok(forecast.days.some((d) => d.assignments.length > 0));
    assert.ok(forecast.headline.length > 0);
    // Arrival day should not schedule before arrival
    for (const a of forecast.days[0].assignments) {
      assert.ok(a.slot.startHour >= trip.arrivalHourLocal - 0.01);
    }
  });
});
