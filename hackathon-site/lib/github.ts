import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";

export type GithubStatus = "clean" | "review" | "flagged";

/** Accepts github.com/owner/repo in the usual forms and returns the canonical https URL. */
export function parseRepoUrl(input: string) {
  const m = input
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:\/[^?#]*)?(?:[?#].*)?$/i);
  if (!m || m[2] === "." || m[2] === "..") return null;
  const [, owner, repo] = m;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

function lastPage(link: string | null) {
  const m = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

/**
 * The automated integrity signal from plan §6: when was the repo's first commit,
 * relative to the event start? Two API calls at most (first page → last page).
 */
export async function inspectRepo(url: string, eventStartIso: string) {
  const parsed = parseRepoUrl(url);
  if (!parsed) return { status: "review" as GithubStatus, firstCommitAt: null, note: "Not a valid GitHub repo URL." };

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "hackathon-site",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`;
  const get = (u: string) => fetch(u, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });

  let res = await get(base);
  if (res.status === 404) {
    return { status: "review" as GithubStatus, firstCommitAt: null, note: "Repo not reachable — still private, renamed, or wrong URL." };
  }
  if (res.status === 409) return { status: "review" as GithubStatus, firstCommitAt: null, note: "Repo has no commits yet." };
  if (res.status === 403 || res.status === 429) {
    return { status: "review" as GithubStatus, firstCommitAt: null, note: "GitHub rate limit hit — re-check later (set GITHUB_TOKEN)." };
  }
  if (!res.ok) return { status: "review" as GithubStatus, firstCommitAt: null, note: `GitHub responded ${res.status}.` };

  const last = lastPage(res.headers.get("link"));
  if (last && last > 1) {
    res = await get(`${base}&page=${last}`);
    if (!res.ok) return { status: "review" as GithubStatus, firstCommitAt: null, note: `GitHub responded ${res.status} on the last page.` };
  }
  const commits = (await res.json()) as { commit?: { author?: { date?: string }; committer?: { date?: string } } }[];
  const first = commits.at(-1)?.commit;
  // Both dates are client-supplied; take the earlier one so a rebase can't hide an old author date.
  const times = [first?.author?.date, first?.committer?.date].filter(Boolean).map((d) => Date.parse(d!));
  if (!times.length) return { status: "review" as GithubStatus, firstCommitAt: null, note: "Could not read the first commit." };

  const firstCommitAt = new Date(Math.min(...times)).toISOString();
  const before = Date.parse(firstCommitAt) < Date.parse(eventStartIso);
  return {
    status: (before ? "flagged" : "clean") as GithubStatus,
    firstCommitAt,
    note: before ? "First commit is before the event start." : "First commit is after the event start.",
  };
}

/** Runs the check for one team and stores the result. Never throws. */
export async function checkTeamRepo(teamId: string) {
  const sql = db();
  try {
    const [team] = await sql<{ github_repo_url: string | null }[]>`select github_repo_url from teams where id = ${teamId}`;
    if (!team?.github_repo_url) return null;
    const { eventStart } = await getSettings();
    const result = await inspectRepo(team.github_repo_url, eventStart);
    await sql`
      update teams set github_status = ${result.status}, github_note = ${result.note},
        first_commit_at = ${result.firstCommitAt}, github_checked_at = now()
      where id = ${teamId}`;
    return result;
  } catch (err) {
    const note = `Check failed: ${(err as Error).message}`.slice(0, 200);
    await sql`update teams set github_status = 'review', github_note = ${note}, github_checked_at = now() where id = ${teamId}`.catch(() => {});
    return { status: "review" as GithubStatus, firstCommitAt: null, note };
  }
}
