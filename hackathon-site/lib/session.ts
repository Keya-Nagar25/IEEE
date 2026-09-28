import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

type Kind = "team" | "admin";

const COOKIE: Record<Kind, string> = { team: "hk_team", admin: "hk_admin" };
// Team sessions cover the whole event even if the browser is closed (plan §7).
export const SESSION_TTL: Record<Kind, number> = { team: 24 * 60 * 60, admin: 12 * 60 * 60 };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function startSession(kind: Kind, subject: string, claims: Record<string, unknown> = {}) {
  const token = await new SignJWT({ ...claims, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL[kind]}s`)
    .sign(key());
  (await cookies()).set(COOKIE[kind], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL[kind],
  });
}

export async function endSession(kind: Kind) {
  (await cookies()).delete(COOKIE[kind]);
}

async function read(kind: Kind) {
  const token = (await cookies()).get(COOKIE[kind])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.kind === kind && typeof payload.sub === "string" ? payload : null;
  } catch {
    return null;
  }
}

export async function getTeamSession() {
  const p = await read("team");
  return p ? { teamId: p.sub as string } : null;
}

export type AdminUser = { id: string; name: string; email: string };

/** Verifies the cookie and that the admin still exists (deleting the row revokes access). */
export async function getAdmin(): Promise<AdminUser | null> {
  const p = await read("admin");
  if (!p) return null;
  const [admin] = await db()<AdminUser[]>`select id, name, email from admins where id = ${p.sub as string}`;
  return admin ?? null;
}
