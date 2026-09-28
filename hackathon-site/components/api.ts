"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

/** JSON request helper for client components; never throws. */
export async function api<T = Record<string, unknown>>(url: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `Request failed (${res.status}).`, status: res.status };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Network error — check your connection and try again.", status: 0 };
  }
}
