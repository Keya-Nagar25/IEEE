import type { Cta } from "@/components/SiteHeader";
import { event } from "./event";
import type { Phase } from "./settings";

/** Header CTA: drive registrations before the event, send teams to their login after. */
export function headerCta(phase: Phase): Cta {
  return phase === "pre"
    ? { label: "Register", href: event.registerUrl, external: true }
    : { label: "Team Login", href: "/team/login" };
}
