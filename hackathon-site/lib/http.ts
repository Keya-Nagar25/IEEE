import "server-only";
import { NextResponse } from "next/server";
import { getAdmin, type AdminUser } from "./session";

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });

export const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });

/**
 * CSRF guard for cookie-authenticated mutations: the body must be JSON (plain
 * cross-site forms can't send that without a CORS preflight) and, when the
 * browser sends an Origin, it must be this site.
 */
export async function readJsonBody<T>(req: Request): Promise<T | null> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
      if (new URL(origin).host !== host) return null;
    } catch {
      return null;
    }
  }
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function clientInfo(req: Request) {
  return {
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64),
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  };
}

type AdminHandler<T> = (admin: AdminUser, body: T, req: Request) => Promise<Response>;

/** Wraps an admin-only JSON endpoint: auth + CSRF + error handling. */
export function adminRoute<T>(handler: AdminHandler<T>) {
  return async (req: Request) => {
    try {
      const admin = await getAdmin();
      if (!admin) return fail(401, "Your admin session has expired. Log in again.");
      const body = await readJsonBody<T>(req);
      if (body === null) return fail(400, "Expected a JSON request from this site.");
      return await handler(admin, body, req);
    } catch (err) {
      console.error("[admin api]", err);
      return fail(500, (err as Error).message || "Something went wrong.");
    }
  };
}
