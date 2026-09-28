// Reasonable-range validation for activity metrics.
// Values outside these ranges are rejected in `activities.log` — the AI
// occasionally miswrites units (e.g. minutes vs seconds), and this is the
// cheapest guard rail before data lands in the main tables.

import { ServiceError } from "./errors";

export const RANGE = {
  durationSec: { min: 30, max: 8 * 3600 }, // 30s .. 8h
  distanceM: { min: 0, max: 300_000 }, // 0 .. 300km (ultras allowed)
  avgHr: { min: 30, max: 240 },
  maxHr: { min: 30, max: 240 },
  rpe: { min: 1, max: 10 },
  calories: { min: 0, max: 20_000 },
  trainingLoad: { min: 0, max: 2_000 },
  paceSecPerKm: { min: 120, max: 1200 }, // 2:00–20:00 min/km
  cadenceSpm: { min: 30, max: 250 },
  gctMs: { min: 100, max: 500 },
  elevationGainM: { min: 0, max: 15_000 },
} as const;

type RangeKey = keyof typeof RANGE;

export function assertInRange(
  value: number | null | undefined,
  key: RangeKey,
  label: string = key,
): void {
  if (value === null || value === undefined) return;
  const { min, max } = RANGE[key];
  if (value < min || value > max) {
    throw new ServiceError(
      "OUT_OF_RANGE",
      `${label} out of range: ${value} (expected ${min}–${max})`,
      { field: label, value, min, max },
    );
  }
}
