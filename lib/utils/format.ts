// Formatters. All base values are in seconds / meters / kg per the architecture rules.

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || sec === 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function fmtDurationRange(
  minSec: number | null | undefined,
  maxSec: number | null | undefined,
): string {
  if (minSec == null && maxSec == null) return "—";
  if (minSec != null && maxSec != null && minSec !== maxSec) {
    return `${fmtDuration(minSec)}–${fmtDuration(maxSec)}`;
  }
  return fmtDuration(minSec ?? maxSec ?? null);
}

export function fmtDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters % 100 === 0 ? 1 : 2)} km`;
  return `${meters} m`;
}

export function fmtPace(secPerKm: number | null | undefined): string {
  if (secPerKm == null || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function fmtHr(bpm: number | null | undefined): string {
  return bpm == null ? "—" : `${bpm} bpm`;
}

export function fmtLoad(kg: string | number | null | undefined): string {
  if (kg == null) return "—";
  const n = typeof kg === "string" ? parseFloat(kg) : kg;
  return Number.isFinite(n) ? `${n} kg` : "—";
}

const SPORT_LABEL: Record<string, string> = {
  run: "Lari",
  strength: "Strength",
  hiit: "HIIT",
  cycling: "Sepeda",
  swim: "Renang",
  mobility: "Mobility",
  walk: "Jalan",
  rest: "Rest",
  other: "Lainnya",
};

export function fmtSport(sport: string): string {
  return SPORT_LABEL[sport] ?? sport;
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  easy: "Easy",
  long: "Long",
  tempo: "Tempo",
  interval: "Interval",
  recovery: "Recovery",
  race: "Race",
  strength: "Strength",
  hiit: "HIIT",
  mobility: "Mobility",
  cross: "Cross",
  rest: "Rest",
  other: "Lainnya",
};

export function fmtSessionType(t: string | null | undefined): string | null {
  if (!t) return null;
  return SESSION_TYPE_LABEL[t] ?? t;
}

// Tailwind color classes per sport, for badges.
export const SPORT_STYLES: Record<string, string> = {
  run: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  strength: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  hiit: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  cycling: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  swim: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  mobility: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  walk: "bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300",
  rest: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HARI_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function fmtHari(iso: string, full = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (full ? HARI_FULL : HARI)[dt.getDay()];
}

export function fmtTanggalPendek(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]}`;
}

export function fmtTanggalLengkap(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function isToday(iso: string): boolean {
  const now = new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
}
