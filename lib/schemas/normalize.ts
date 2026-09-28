// Best-effort normalization for common enum aliases that AI outputs even when
// prompted with exact strings. Applied BEFORE Zod validation so users don't
// need to regenerate JSON just because AI wrote "cycle" instead of "cycling".

const SPORT_ALIASES: Record<string, string> = {
  cycle: "cycling",
  bike: "cycling",
  biking: "cycling",
  running: "run",
  jog: "run",
  jogging: "run",
  swimming: "swim",
  weights: "strength",
  gym: "strength",
  lifting: "strength",
  crosstraining: "cross",
  "cross-training": "cross",
  restday: "rest",
  yoga: "mobility",
  stretch: "mobility",
  stretching: "mobility",
  walking: "walk",
  hiking: "walk",
};

const SESSION_TYPE_ALIASES: Record<string, string> = {
  intervals: "interval",
  crosstraining: "cross",
  "cross-training": "cross",
  racing: "race",
  restday: "rest",
  hills: "tempo",
};

function normalizeEnum(value: unknown, aliases: Record<string, string>): unknown {
  if (typeof value !== "string") return value;
  const lower = value.toLowerCase().trim();
  return aliases[lower] ?? lower;
}

// Deeply normalize sport + session_type on any object shape (plan or activity import).
export function normalizePlanImport<T>(input: T): T {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;

  // Sessions array (plan or activity single form via items)
  if (Array.isArray(obj.sessions)) {
    obj.sessions = (obj.sessions as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      sport: normalizeEnum(s.sport, SPORT_ALIASES),
      session_type: normalizeEnum(s.session_type, SESSION_TYPE_ALIASES),
    }));
  }
  // Top-level sport/session_type (activity import)
  if ("sport" in obj) obj.sport = normalizeEnum(obj.sport, SPORT_ALIASES);
  if ("session_type" in obj)
    obj.session_type = normalizeEnum(obj.session_type, SESSION_TYPE_ALIASES);
  return input;
}
