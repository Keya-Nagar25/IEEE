import { revalidatePath } from "next/cache";
import { getCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { adminRoute, fail, ok } from "@/lib/http";

type Input = { criteria?: { id?: string; name?: unknown; weight?: unknown }[] };

export const PUT = adminRoute<Input>(async (_admin, body) => {
  const list = Array.isArray(body.criteria) ? body.criteria : null;
  if (!list || !list.length || list.length > 12) return fail(400, "Provide between 1 and 12 criteria.");

  const clean = list.map((c, i) => ({
    id: typeof c.id === "string" && /^[0-9a-f-]{36}$/i.test(c.id) ? c.id : null,
    name: String(c.name ?? "").trim().slice(0, 60),
    weight: Math.round(Number(c.weight) * 100) / 100,
    position: i + 1,
  }));
  if (clean.some((c) => !c.name)) return fail(400, "Every criterion needs a name.");
  if (new Set(clean.map((c) => c.name.toLowerCase())).size !== clean.length) return fail(400, "Criterion names must be unique.");
  if (clean.some((c) => !Number.isFinite(c.weight) || c.weight < 0 || c.weight > 100)) return fail(400, "Weights must be 0–100.");
  const total = clean.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(total - 100) > 0.01) return fail(400, `Weights must add up to 100% (currently ${total}%).`);

  await db().begin(async (sql) => {
    const keep = clean.filter((c) => c.id).map((c) => c.id as string);
    // Removing a criterion also removes its imported scores (FK cascade).
    if (keep.length) await sql`delete from criteria where id <> all(${keep}::uuid[])`;
    else await sql`delete from criteria`;
    // Park names first so renames that swap names don't trip the unique constraint.
    if (keep.length) await sql`update criteria set name = '__tmp__' || id::text where id = any(${keep}::uuid[])`;
    for (const c of clean) {
      if (c.id) await sql`update criteria set name = ${c.name}, weight = ${c.weight}, position = ${c.position} where id = ${c.id}`;
      else await sql`insert into criteria (name, weight, position) values (${c.name}, ${c.weight}, ${c.position})`;
    }
  });

  revalidatePath("/rules");
  return ok({ criteria: await getCriteria() });
});
