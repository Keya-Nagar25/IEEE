import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { clientInfo, fail, ok, readJsonBody } from "@/lib/http";
import { startSession } from "@/lib/session";

// A valid bcrypt hash of a random string, so unknown emails take as long as wrong passwords.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.0PiJ3bDBBqV5jUFjNNWmVx8QRzCe";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody<{ email?: unknown; password?: unknown }>(req);
    if (!body) return fail(400, "Bad request.");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return fail(400, "Enter your email and password.");

    const sql = db();
    const { ip, userAgent } = clientInfo(req);
    const [{ recent }] = await sql<{ recent: number }[]>`
      select count(*)::int as recent from login_events
      where kind = 'admin' and identifier = ${email} and not success and created_at > now() - interval '15 minutes'`;
    if (recent >= 8) return fail(429, "Too many failed attempts. Wait 15 minutes.");

    const [admin] = await sql<{ id: string; password_hash: string }[]>`
      select id, password_hash from admins where lower(email) = ${email}`;
    const valid = await compare(password, admin?.password_hash ?? DUMMY_HASH);

    await sql`insert into login_events (kind, identifier, success, ip, user_agent)
              values ('admin', ${email}, ${Boolean(admin && valid)}, ${ip}, ${userAgent})`;
    if (!admin || !valid) return fail(401, "Wrong email or password.");

    await startSession("admin", admin.id);
    return ok();
  } catch (err) {
    console.error("[admin login]", err);
    return fail(500, (err as Error).message || "Login failed.");
  }
}
