import { config as loadEnv } from "dotenv";

// Load .env.local before any DB import.
loadEnv({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("Tests require DATABASE_URL from .env.local");
}
