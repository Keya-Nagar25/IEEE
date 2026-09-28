// Applies db/schema.sql to DATABASE_URL. Safe to re-run.
// Usage: npm run db:setup   (reads .env.local)
import { readFileSync } from "node:fs";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: /supabase\.(co|com)/.test(url) && !/sslmode=/.test(url) ? "require" : undefined,
  onnotice: () => {},
});

try {
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
  const [{ admins }] = await sql`select count(*)::int as admins from admins`;
  const [{ teams }] = await sql`select count(*)::int as teams from teams`;
  console.log(`✓ Schema applied. ${teams} teams, ${admins} admins.`);
  if (!admins) console.log("  Next: create an organizer login with `npm run admin:create`.");
} catch (err) {
  console.error("✗ Schema failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
