import { ok } from "@/lib/http";
import { endSession } from "@/lib/session";

export async function POST() {
  await endSession("admin");
  return ok();
}
