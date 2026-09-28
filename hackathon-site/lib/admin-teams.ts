import "server-only";
import { decryptCode } from "./codes";
import { db, iso } from "./db";

export type AdminTeam = {
  id: string;
  teamNumber: number;
  name: string;
  leaderName: string;
  leaderEmail: string;
  college: string;
  code: string | null;
  repoUrl: string | null;
  githubStatus: "clean" | "review" | "flagged" | null;
  githubNote: string | null;
  firstCommitAt: string | null;
  githubCheckedAt: string | null;
  submittedAt: string | null;
  status: "building" | "submitted" | "disqualified";
  locked: boolean;
  credentialsSentAt: string | null;
  members: string[];
};

export async function getAdminTeams(): Promise<AdminTeam[]> {
  const rows = await db()<
    {
      id: string;
      team_number: number;
      name: string;
      leader_name: string;
      leader_email: string;
      college: string;
      login_code_enc: string;
      github_repo_url: string | null;
      github_status: AdminTeam["githubStatus"];
      github_note: string | null;
      first_commit_at: Date | null;
      github_checked_at: Date | null;
      submitted_at: Date | null;
      submission_status: AdminTeam["status"];
      locked: boolean;
      credentials_sent_at: Date | null;
      members: string[];
    }[]
  >`
    select t.id, t.team_number, t.name, t.leader_name, t.leader_email, t.college, t.login_code_enc,
           t.github_repo_url, t.github_status, t.github_note, t.first_commit_at, t.github_checked_at,
           t.submitted_at, t.submission_status, coalesce(t.locked_until > now(), false) as locked,
           t.credentials_sent_at,
           coalesce(array_agg(m.name order by m.name) filter (where m.id is not null), '{}') as members
    from teams t left join members m on m.team_id = t.id
    group by t.id
    order by t.team_number`;

  return rows.map((r) => ({
    id: r.id,
    teamNumber: r.team_number,
    name: r.name,
    leaderName: r.leader_name,
    leaderEmail: r.leader_email,
    college: r.college,
    code: decryptCode(r.login_code_enc),
    repoUrl: r.github_repo_url,
    githubStatus: r.github_status,
    githubNote: r.github_note,
    firstCommitAt: iso(r.first_commit_at),
    githubCheckedAt: iso(r.github_checked_at),
    submittedAt: iso(r.submitted_at),
    status: r.submission_status,
    locked: r.locked,
    credentialsSentAt: iso(r.credentials_sent_at),
    members: r.members,
  }));
}
