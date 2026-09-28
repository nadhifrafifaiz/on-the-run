import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });

// drizzle-kit uses DIRECT_URL for migrations (session pooler, port 5432);
// falls back to DATABASE_URL for local dev.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DIRECT_URL or DATABASE_URL is required (Supabase Postgres connection string).");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
  // Ignore Supabase's auth/storage schemas — we don't own them.
  schemaFilter: ["public"],
});
