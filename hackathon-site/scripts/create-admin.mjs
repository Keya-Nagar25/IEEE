
import { hash } from "bcryptjs";
import readline from "node:readline/promises";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);

async function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (s) => {
      if (s.includes("\n") || s.includes("\r")) rl.output.write("\n");
    };
    process.stdout.write(question);
  }
  const answer = await rl.question(hidden ? "" : question);
  rl.close();
  return answer.trim();
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}

const name = args.name || (await ask("Name: "));
const email = (args.email || (await ask("Email: "))).toLowerCase();
const password = args.password || (await ask("Password (min 10 chars, hidden): ", { hidden: true }));

if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error("A name and a valid email are required.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: /supabase\.(co|com)/.test(url) && !/sslmode=/.test(url) ? "require" : undefined,
});

try {
  const passwordHash = await hash(password, 12);
  const [row] = await sql`
    insert into admins (name, email, password_hash) values (${name}, ${email}, ${passwordHash})
    on conflict ((lower(email))) do update set name = excluded.name, password_hash = excluded.password_hash
    returning (xmax = 0) as created`;
  console.log(row.created ? `✓ Admin ${email} created.` : `✓ Password updated for ${email}.`);
  console.log("  Log in at /admin/login");
} catch (err) {
  console.error("✗", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
