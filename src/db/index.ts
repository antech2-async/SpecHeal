import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readDatabaseEnv } from "@/lib/env";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDb() {
  const env = readDatabaseEnv();
  if (!pool) {
    const isProduction = process.env.NODE_ENV === "production";
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: isProduction ? 10000 : 1500,
      idleTimeoutMillis: 5000,
      query_timeout: isProduction ? 15000 : 1500
    });
    pool.on("error", (error) => {
      console.warn(`[SpecHeal] PostgreSQL pool error: ${error.message}`);
    });
  }

  return drizzle(pool, { schema });
}

export type DbClient = ReturnType<typeof getDb>;
