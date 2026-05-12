import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readServerEnv } from "@/lib/env";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDb() {
  const env = readServerEnv();
  pool ??= new Pool({
    connectionString: env.DATABASE_URL
  });

  return drizzle(pool, { schema });
}

export type DbClient = ReturnType<typeof getDb>;
