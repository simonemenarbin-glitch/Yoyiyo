import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TravelDna, TripForecast, TripInput } from './types';
import { getDestination } from './destinations';
import { buildTripForecast } from './algorithm/forecast';

const DEFAULT_DNA: TravelDna = {
  chronotype: 'neutral',
  pace: 'balanced',
  crowdTolerance: 'ok',
  priorities: ['food', 'culture'],
  walkingKmPerDay: 8,
  decisionFatigueSensitivity: 0.5,
};

interface AppState {
  dna: TravelDna;
  setDna: (dna: TravelDna) => void;
  trip: TripInput | null;
  forecast: TripForecast | null;
  /** Atomically set trip + compute forecast (avoids navigate race). */
  predict: (trip: TripInput, dnaOverride?: TravelDna) => TripForecast | null;
  reset: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dna, setDna] = useState<TravelDna>(DEFAULT_DNA);
  const [trip, setTrip] = useState<TripInput | null>(null);
  const [forecast, setForecast] = useState<TripForecast | null>(null);

  const predict = useCallback(
    (nextTrip: TripInput, dnaOverride?: TravelDna) => {
      const profile = dnaOverride ?? dna;
      const dest = getDestination(nextTrip.destinationId);
      if (!dest) return null;
      const result = buildTripForecast(dest, nextTrip, profile);
      setTrip(nextTrip);
      setForecast(result);
      return result;
    },
    [dna],
  );

  const reset = useCallback(() => {
    setForecast(null);
    setTrip(null);
    setDna(DEFAULT_DNA);
  }, []);

  const value = useMemo(
    () => ({ dna, setDna, trip, forecast, predict, reset }),
    [dna, trip, forecast, predict, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export { DEFAULT_DNA };
