import Link from "next/link";
import { event } from "@/lib/event";

export default function SiteFooter({ dates }: { dates?: string }) {
  return (
    <footer className="site-foot">
      <span>
        {event.name}
        {dates ? ` · ${dates}` : ""} · {event.venue}
      </span>
      <nav aria-label="Footer">
        <a href={event.registerUrl} target="_blank" rel="noopener noreferrer">
          Register
        </a>
        <a href={event.whatsappUrl} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <Link href="/team/login">Team login</Link>
      </nav>
    </footer>
  );
}
