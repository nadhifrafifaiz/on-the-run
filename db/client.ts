import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForDb = globalThis as unknown as {
  __otr_pg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__otr_pg ??
  postgres(url, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__otr_pg = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
