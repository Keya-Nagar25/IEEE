
create table if not exists teams (
  id                  uuid primary key default gen_random_uuid(),
  team_number         integer not null unique,
  name                text not null,
  leader_name         text not null default '',
  leader_email        text not null default '',
  college             text not null default '',
  login_code_hash     text not null,             
  login_code_enc      text not null,             
  github_repo_url     text,
  github_status       text check (github_status in ('clean', 'review', 'flagged')),
  github_note         text,
  github_checked_at   timestamptz,
  first_commit_at     timestamptz,
  submitted_at        timestamptz,
  submission_status   text not null default 'building'
                        check (submission_status in ('building', 'submitted', 'disqualified')),
  failed_attempts     integer not null default 0,
  locked_until        timestamptz,
  credentials_sent_at timestamptz,
  created_at          timestamptz not null default now()
);
create unique index if not exists teams_name_lower_key on teams (lower(name));

create table if not exists members (
  id      uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  name    text not null,
  email   text not null default ''
);
create index if not exists members_team_id_idx on members (team_id);

create table if not exists criteria (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  weight   numeric(5, 2) not null check (weight >= 0 and weight <= 100),  
  position integer not null default 0
);

create table if not exists scores (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (id) on delete cascade,
  criterion_id uuid not null references criteria (id) on delete cascade,
  judge        text not null default '',
  value        numeric(4, 2) not null check (value >= 0 and value <= 10),
  notes        text not null default '',
  imported_at  timestamptz not null default now(),
  unique (team_id, criterion_id, judge)
);

create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  password_hash text not null,                    
  created_at    timestamptz not null default now()
);
create unique index if not exists admins_email_lower_key on admins (lower(email));

create table if not exists settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists login_events (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('team', 'admin')),
  team_id    uuid references teams (id) on delete set null,
  identifier text not null default '',
  success    boolean not null,
  ip         text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists login_events_lookup_idx on login_events (kind, identifier, created_at desc);
create table if not exists live_signals (
  key       text primary key,
  bumped_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('event_start_time', ''),
  ('submission_deadline', ''),
  ('leaderboard_visible', 'false'),
  ('scores_visible', 'false'),
  ('theme_revealed', 'false'),
  ('theme_title', ''),
  ('theme_description', '')
on conflict (key) do nothing;

insert into criteria (name, weight, position)
select * from (values
  ('Innovation', 25.00, 1),
  ('Execution', 30.00, 2),
  ('Design', 20.00, 3),
  ('Problem Fit', 25.00, 4)
) as defaults (name, weight, position)
where not exists (select 1 from criteria);

insert into live_signals (key) values ('leaderboard') on conflict (key) do nothing;

create or replace function bump_leaderboard_signal() returns trigger
language plpgsql as $$
begin
  insert into live_signals (key, bumped_at) values ('leaderboard', clock_timestamp())
  on conflict (key) do update set bumped_at = excluded.bumped_at;
  return null;
end $$;

drop trigger if exists scores_bump_leaderboard on scores;
create trigger scores_bump_leaderboard
  after insert or update or delete on scores
  for each statement execute function bump_leaderboard_signal();

drop trigger if exists criteria_bump_leaderboard on criteria;
create trigger criteria_bump_leaderboard
  after insert or update or delete on criteria
  for each statement execute function bump_leaderboard_signal();

drop trigger if exists teams_bump_leaderboard_ins_del on teams;
create trigger teams_bump_leaderboard_ins_del
  after insert or delete on teams
  for each statement execute function bump_leaderboard_signal();
drop trigger if exists teams_bump_leaderboard_upd on teams;
create trigger teams_bump_leaderboard_upd
  after update of name, team_number, submission_status, submitted_at on teams
  for each statement execute function bump_leaderboard_signal();

drop trigger if exists settings_bump_leaderboard on settings;
create trigger settings_bump_leaderboard
  after insert or update on settings
  for each row when (new.key in ('leaderboard_visible', 'scores_visible'))
  execute function bump_leaderboard_signal();
alter table teams        enable row level security;
alter table members      enable row level security;
alter table criteria     enable row level security;
alter table scores       enable row level security;
alter table admins       enable row level security;
alter table settings     enable row level security;
alter table login_events enable row level security;
alter table live_signals enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on teams, members, criteria, scores, admins, settings, login_events
      from anon, authenticated;
    grant select on live_signals to anon, authenticated;
    drop policy if exists "live signals are public" on live_signals;
    create policy "live signals are public" on live_signals
      for select to anon, authenticated using (true);
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_signals'
     ) then
    alter publication supabase_realtime add table live_signals;
  end if;
end $$;
