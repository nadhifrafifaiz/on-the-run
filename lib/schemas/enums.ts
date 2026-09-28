import { z } from "zod";

export const sportZ = z.enum([
  "run",
  "strength",
  "hiit",
  "cycling",
  "swim",
  "mobility",
  "walk",
  "rest",
  "other",
]);

export const sessionTypeZ = z.enum([
  "easy",
  "long",
  "tempo",
  "interval",
  "recovery",
  "race",
  "strength",
  "hiit",
  "mobility",
  "cross",
  "rest",
  "other",
]);

export const feelZ = z.enum(["great", "good", "okay", "tough", "bad"]);
export const setStatusZ = z.enum(["done", "partial", "failed", "skipped"]);
export const sourceZ = z.enum(["manual", "json", "mcp", "notion"]);
export const sessionStatusZ = z.enum(["planned", "done", "skipped", "modified"]);
export const programTypeZ = z.enum(["main", "supporting"]);
export const programStatusZ = z.enum(["draft", "active", "completed", "archived"]);
export const draftStatusZ = z.enum(["pending", "saved", "discarded"]);
export const raceStatusZ = z.enum(["planned", "done", "dns", "dnf"]);
export const distanceLabelZ = z.enum(["5K", "10K", "HM", "FM", "other"]);
export const unitsZ = z.enum(["metric", "imperial"]);
export const weekStartZ = z.enum(["monday", "sunday"]);
export const conditionZ = z.enum(["normal", "sick", "injured", "fatigued", "other"]);

// YYYY-MM-DD
export const isoDateZ = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
