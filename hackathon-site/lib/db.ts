import "server-only";
import postgres from "postgres";

type Sql = postgres.Sql;

const globalForDb = globalThis as unknown as { __sql?: Sql };

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Shared Postgres client. On Vercel each function instance keeps a small pool
 * and reuses it across invocations. Point DATABASE_URL at Supabase's
 * *transaction pooler* (port 6543) so bursts of serverless instances share
 * connections instead of exhausting them.
 */
export function db(): Sql {
  if (globalForDb.__sql) return globalForDb.__sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  const isSupabase = /supabase\.(co|com)/.test(url);
  globalForDb.__sql = postgres(url, {
    prepare: false, // required by the transaction pooler
    max: 3,
    idle_timeout: 20,
    connect_timeout: 8,
    ssl: isSupabase && !/sslmode=/.test(url) ? "require" : undefined,
    onnotice: () => {},
  });
  return globalForDb.__sql;
}

export const iso = (d: Date | string | null | undefined) =>
  d == null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString();
