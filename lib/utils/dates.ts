// Date utilities. Dates are stored as `YYYY-MM-DD` strings to match Postgres `date` type.

export type IsoDate = string; // "YYYY-MM-DD"

export function toIsoDate(d: Date): IsoDate {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

// weekStart: which day the user's week starts on.
export function weekStartOf(iso: IsoDate, weekStart: "monday" | "sunday" = "monday"): IsoDate {
  const d = fromIsoDate(iso);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = weekStart === "monday" ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = fromIsoDate(from).getTime();
  const b = fromIsoDate(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
