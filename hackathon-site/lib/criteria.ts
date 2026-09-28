import "server-only";
import { db, hasDatabase } from "./db";

export type Criterion = { id: string; name: string; weight: number; position: number };

const FALLBACK: Criterion[] = [
  { id: "innovation", name: "Innovation", weight: 25, position: 1 },
  { id: "execution", name: "Execution", weight: 30, position: 2 },
  { id: "design", name: "Design", weight: 20, position: 3 },
  { id: "problem-fit", name: "Problem Fit", weight: 25, position: 4 },
];

export async function getCriteria(): Promise<Criterion[]> {
  return db()<Criterion[]>`
    select id, name, weight::float8 as weight, position from criteria order by position, name`;
}

export async function getCriteriaSafe(): Promise<Criterion[]> {
  if (!hasDatabase()) return FALLBACK;
  try {
    const rows = await getCriteria();
    return rows.length ? rows : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
