/** Shared domain types for Yoyiyo Temporal Fit Engine */

export type Chronotype = 'lark' | 'neutral' | 'owl';
export type Pace = 'slow' | 'balanced' | 'intense';
export type CrowdTolerance = 'avoid' | 'ok' | 'seek';
export type Priority =
  | 'food'
  | 'culture'
  | 'nature'
  | 'nightlife'
  | 'photo'
  | 'rest';

export type PlaceKind =
  | 'viewpoint'
  | 'museum'
  | 'market'
  | 'neighborhood'
  | 'restaurant'
  | 'nightlife'
  | 'park'
  | 'ritual';

export interface TravelDna {
  chronotype: Chronotype;
  pace: Pace;
  crowdTolerance: CrowdTolerance;
  priorities: Priority[];
  walkingKmPerDay: number;
  decisionFatigueSensitivity: number; // 0–1
}

export interface TripInput {
  destinationId: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  arrivalHourLocal: number; // 0–23
  homeTimezoneOffset: number; // hours from UTC
  destinationTimezoneOffset: number;
}

export interface PlaceWindow {
  /** Local hour when experience quality peaks (0–23) */
  peakHour: number;
  /** Half-width of the quality bell curve in hours */
  peakWidth: number;
  /** Typical crowd intensity 0–1 at peak */
  crowdAtPeak: number;
  /** Light quality bonus hours (golden/blue hour affinity) */
  lightAffinity: 'dawn' | 'day' | 'golden' | 'night';
}

export interface Experience {
  id: string;
  name: string;
  kind: PlaceKind;
  durationHours: number;
  walkingCostKm: number;
  decisionLoad: number; // 0–1 complexity
  regretWeight: number; // 0–1 how painful to miss for average traveler
  window: PlaceWindow;
  priorityTags: Priority[];
  description: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  timezoneOffset: number;
  tagline: string;
  experiences: Experience[];
}

export interface TimeSlot {
  dayIndex: number;
  startHour: number;
  endHour: number;
}

export interface Assignment {
  experience: Experience;
  slot: TimeSlot;
  score: TemporalFitBreakdown;
}

export interface TemporalFitBreakdown {
  total: number;
  energyAlignment: number;
  placeQuality: number;
  chronotypeMatch: number;
  crowdFit: number;
  lightQuality: number;
  regretProtected: number;
  driftRisk: number;
}

export interface DayForecast {
  dayIndex: number;
  date: string;
  energyCurve: { hour: number; energy: number }[];
  assignments: Assignment[];
  warnings: string[];
  jetLagRecovery: number; // 0–1 recovered
}

export interface TripForecast {
  destination: Destination;
  trip: TripInput;
  dna: TravelDna;
  days: DayForecast[];
  headline: string;
  insight: string;
}
