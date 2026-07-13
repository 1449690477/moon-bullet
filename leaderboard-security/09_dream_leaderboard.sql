-- 梦境模式排行榜：独立成绩表与一次性运行令牌
-- 公开客户端只读成绩；写入必须经过 leaderboard-run Edge Function 的 service_role。

create extension if not exists pgcrypto;

create table if not exists public.dream_leaderboard_runs (
  run_id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  stage_id text not null,
  clear_version text not null,
  seed bigint not null,
  character text not null,
  wing_loadout jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  ip_hash text,
  ua_hash text,
  client_version text,
  constraint dream_runs_stage_check check (stage_id = 'dream-01-seraph'),
  constraint dream_runs_version_check check (clear_version = 'dream-01-v1'),
  constraint dream_runs_seed_check check (seed = 7130101),
  constraint dream_runs_character_check check (
    character in ('witch', 'yanuxiya', 'anna', 'reaver', 'motherlife', 'skyward', 'corruptgun')
  ),
  constraint dream_runs_wings_check check (
    jsonb_typeof(wing_loadout) = 'array' and jsonb_array_length(wing_loadout) <= 6
  )
);

create index if not exists idx_dream_runs_expires
  on public.dream_leaderboard_runs (expires_at);

create table if not exists public.dream_leaderboard (
  id bigint generated always as identity primary key,
  stage_id text not null,
  clear_version text not null,
  player_name text not null,
  player_name_key text not null,
  character text not null,
  wing_loadout jsonb not null default '[]'::jsonb,
  stars smallint not null,
  elapsed_ms integer not null,
  hit_count smallint not null,
  avatar_data text,
  run_id uuid not null unique references public.dream_leaderboard_runs(run_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dream_scores_stage_check check (stage_id = 'dream-01-seraph'),
  constraint dream_scores_version_check check (clear_version = 'dream-01-v1'),
  constraint dream_scores_name_check check (
    char_length(btrim(player_name)) between 1 and 24 and char_length(player_name_key) between 1 and 48
  ),
  constraint dream_scores_character_check check (
    character in ('witch', 'yanuxiya', 'anna', 'reaver', 'motherlife', 'skyward', 'corruptgun')
  ),
  constraint dream_scores_wings_check check (
    jsonb_typeof(wing_loadout) = 'array' and jsonb_array_length(wing_loadout) <= 6
  ),
  constraint dream_scores_stars_check check (stars between 0 and 3),
  constraint dream_scores_hits_check check (hit_count between 0 and 3 and stars = 3 - hit_count),
  constraint dream_scores_elapsed_check check (elapsed_ms between 60000 and 3600000)
);

-- 同昵称、同关卡版本、同战机只保留一条最佳成绩。
create unique index if not exists uq_dream_scores_player_character
  on public.dream_leaderboard (stage_id, clear_version, player_name_key, character);

create index if not exists idx_dream_scores_rank
  on public.dream_leaderboard (stage_id, clear_version, stars desc, elapsed_ms asc, created_at asc);

create index if not exists idx_dream_scores_character_rank
  on public.dream_leaderboard (stage_id, clear_version, character, stars desc, elapsed_ms asc, created_at asc);

alter table public.dream_leaderboard enable row level security;
alter table public.dream_leaderboard_runs enable row level security;

drop policy if exists "public read dream leaderboard" on public.dream_leaderboard;
create policy "public read dream leaderboard"
  on public.dream_leaderboard
  for select
  to anon, authenticated
  using (true);

grant select on public.dream_leaderboard to anon, authenticated;
revoke insert, update, delete on public.dream_leaderboard from anon, authenticated;
revoke all on public.dream_leaderboard_runs from anon, authenticated;

grant all on public.dream_leaderboard to service_role;
grant all on public.dream_leaderboard_runs to service_role;
grant usage, select on sequence public.dream_leaderboard_id_seq to service_role;

-- 总榜视图：同昵称跨战机只展示星级更高、同星更快的一条。
create or replace view public.dream_leaderboard_best
with (security_invoker = true)
as
select distinct on (stage_id, clear_version, player_name_key)
  id, stage_id, clear_version, player_name, character, wing_loadout,
  stars, elapsed_ms, hit_count, avatar_data, created_at, updated_at
from public.dream_leaderboard
order by stage_id, clear_version, player_name_key,
  stars desc, elapsed_ms asc, created_at asc;

grant select on public.dream_leaderboard_best to anon, authenticated;
