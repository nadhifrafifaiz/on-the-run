// Coercion helpers for Notion → app types.
// Handles the various formats we've observed in the actual Notion tables:
// duration "2:58:27" / "00:33:08", pace "8'19\"" / "8:05" / "8'17\"",
// balance "49.9/50.1" / "49.9 / 50.1" / "50.0/50.0".

export function durationToSec(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((s) => Number(s.trim()));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// Pace like `8'19"`, `8'19`, `8:19`, `8:05 /km`, `8'05" /km`.
export function paceToSecPerKm(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.trim().replace(/\s*\/km$/i, "").trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d+)['":](\d{1,2})/);
  if (!match) return null;
  const m = Number(match[1]);
  const s = Number(match[2]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return m * 60 + s;
}

export function balanceToLR(
  input: string | null | undefined,
): { left: number; right: number } | null {
  if (!input) return null;
  const cleaned = input.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[2]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return { left, right };
}

const RUN_TYPE_TO_SESSION: Record<string, string> = {
  "Easy Run": "easy",
  "Recovery Run": "recovery",
  "Long Run": "long",
  "Tempo Run": "tempo",
  "Interval Run": "interval",
  Race: "race",
};

export function mapRunType(input: string | null): string | null {
  if (!input) return null;
  return RUN_TYPE_TO_SESSION[input] ?? null;
}

const FEEL_MAP: Record<string, string> = {
  Great: "great",
  Good: "good",
  Okay: "okay",
  Tough: "tough",
  Bad: "bad",
};

export function mapFeel(input: string | null): string | null {
  if (!input) return null;
  return FEEL_MAP[input] ?? null;
}

// Detect a standard race distance from km value (5K / 10K / HM / FM).
export function standardEffortDistanceM(km: number | null | undefined): number | null {
  if (km == null) return null;
  const meters = km * 1000;
  const tolerances: Array<[label: number, target: number, tol: number]> = [
    [5000, 5000, 200], // 4.8–5.2km → 5K
    [10000, 10000, 400],
    [21097, 21097, 500],
    [42195, 42195, 800],
  ];
  for (const [target, , tol] of tolerances) {
    if (Math.abs(meters - target) <= tol) return target;
  }
  return null;
}
