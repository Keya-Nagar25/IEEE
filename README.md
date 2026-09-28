# IEEE Hackathon site

Marketing site + event-day management for the hackathon, built from `hackathon-site-plan.md`
with the Vesper landing-page design system.

- **Public:** `/` (landing, live countdown), `/about` (theme reveal), `/rules`, `/schedule`, `/leaderboard` (live)
- **Teams:** `/team/login` (team number + code), `/team/dashboard` (repo link, submit, results)
- **Organizers:** `/admin` — overview & settings, Unstop CSV import, teams, scores, leaderboard toggle, credential emails, printable chits

**Stack (plan Option A):** Next.js 15 App Router on Vercel · Supabase Postgres + Realtime · no other services.

---

## 1. Fill in the event details

Everything the public site says is in [`lib/event.ts`](lib/event.ts). Search for `TODO`:
name, tagline, venue, Unstop link, WhatsApp link, prizes, eligibility, schedule, reviewer GitHub username.

Event start, submission deadline and the **theme** are set in `/admin` (no redeploy needed).
Keep the theme out of `lib/event.ts` — the repo may be public.

## 2. Supabase (database + realtime)

1. Create a project at [supabase.com](https://supabase.com) — region **Mumbai (ap-south-1)** if the event is in India.
2. **Project Settings → Database → Connection string → Transaction pooler** (port `6543`). That's `DATABASE_URL`.
3. **Project Settings → API**: copy the Project URL and the `anon` (or `publishable`) key.
4. Create `.env.local` from `.env.example`, fill it in, then:

```bash
npm install
```

```bash
npm run db:setup
```

```bash
npm run admin:create
```

`db:setup` is safe to re-run. It creates the tables, enables Row Level Security everywhere
(the public anon key can read nothing except a timestamp used for live updates), and adds
that table to Supabase Realtime. You can also paste `db/schema.sql` into the SQL editor instead.

**Keep-alive (plan §5):** free Supabase projects pause after 7 idle days. `vercel.json` already
schedules a Vercel Cron hit on `/api/health` every 2 days (it queries the DB). As a second line,
add a free job on [cron-job.org](https://cron-job.org) for `https://YOUR-SITE/api/health` every 3 days.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo, then **vercel.com → Add New → Project → Import** it.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
   Generate `SESSION_SECRET` and `CODE_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

3. Deploy. Set `NEXT_PUBLIC_SITE_URL` to the final URL (custom domain or `*.vercel.app`) and redeploy.

`vercel.json` pins functions to **`bom1` (Mumbai)**. Change it if your Supabase project is in
another region — the two must be close, or every database query crosses an ocean.

Or with the CLI, from this folder:

```bash
npx vercel login
```

```bash
npx vercel --prod
```

### Optional services
- `GITHUB_TOKEN` — raises the GitHub limit to 5,000/hour. A classic token with `repo` scope from the
  reviewer account (added as collaborator) can also check repos while they're still private.
- `SMTP_*` — for "Send credentials". A Gmail app password works (~500 emails/day).
  Supabase Auth can't send custom emails, so this uses plain SMTP.

## 4. Event-day runbook

| When | Where | What |
|---|---|---|
| Registrations close | `/admin/import` | Upload the Unstop CSV → preview → create. Columns are auto-detected; one-row-per-team and one-row-per-person exports both work. |
| Night before | `/admin/send-credentials` | Email every leader their team number + code (batched, never double-sends). |
| Night before | `/admin/print` | Print chits for check-in (backup for email). |
| Kick-off | `/admin` | Check start/deadline, enter the theme, tick **Reveal theme**, save. |
| Build window | `/admin/teams` | Watch submissions. **Re-check all GitHub** once repos go public. Flags are admin-only. |
| Judging | `/admin/scores` | Download the Excel template → fill from paper sheets (one row per team per judge) → upload. |
| Results | `/admin/leaderboard` | Flip **Leaderboard visible** (and optionally **Show scores**). Every open page updates in seconds. |
| Dry run | `/admin` → Danger zone | Delete test teams/scores before the real import. |

**If something breaks:** the Supabase table editor is the source of truth — edit rows there directly.
Lost code → `/admin/teams` → **Show codes**, or **New login code**. Locked out after 5 wrong tries →
**Unlock login**. Leaderboard realtime drops → pages fall back to polling every 30s on their own.

## How the plan's requirements map to the code

- **Static pages can't go down:** `/`, `/about`, `/rules`, `/schedule`, `/leaderboard` are prerendered
  and served from the CDN; they revalidate every 5 min or instantly when an admin saves settings,
  and fall back to defaults if the database is unreachable.
- **Live leaderboard without melting the free tier:** browsers subscribe to one Realtime row; on change
  they fetch `/api/leaderboard?v=<timestamp>`, which the CDN caches, so ~70 viewers cost about one
  function call per update.
- **Deadline rush:** submit is one `UPDATE`; the GitHub first-commit check runs after the response
  (`after()`), so teams never wait on GitHub.
- **Login codes:** HMAC-hashed for verification and AES-encrypted so organizers can read one back.
  Neither is reversible from the database alone. 5 wrong attempts → 10-minute lock. Every attempt is
  logged in `login_events`. Sessions last 24h.
- **Scoring:** `Σ(average judge score per criterion × weight)`; ties go to the earlier submission.
  Disqualified teams are hidden from the public board.

## Local development

`npm run dev` with `.env.local` pointing at a Supabase project (a separate "dev" project is ideal).
`npm run typecheck` and `npm run build` should both pass before you push.

Fonts load from Google Fonts. To self-host them, put `inter.woff2` and `instrument-serif-italic.woff2`
in `public/fonts/`, uncomment the `@font-face` rules at the top of `app/landing.css`, and remove the
`<link>` in `app/layout.tsx`.
