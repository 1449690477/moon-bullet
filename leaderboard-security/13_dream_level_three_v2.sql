-- Dream mode level-three V2 leaderboard contract.
-- This is a final-state migration: it can follow the base Dream migrations
-- directly and preserves all existing V1/V2 score rows.

begin;

do $$
begin
  if to_regclass('public.dream_leaderboard_runs') is null
     or to_regclass('public.dream_leaderboard') is null then
    raise exception 'Run leaderboard-security/09_dream_leaderboard.sql and 10_dream_v2_balance.sql before 13_dream_level_three_v2.sql';
  end if;
end
$$;

-- Token rows bind stage, clear version, and deterministic seed as one contract.
alter table public.dream_leaderboard_runs
  drop constraint if exists dream_runs_stage_contract_check;
alter table public.dream_leaderboard_runs
  drop constraint if exists dream_runs_stage_check;
alter table public.dream_leaderboard_runs
  drop constraint if exists dream_runs_version_check;
alter table public.dream_leaderboard_runs
  drop constraint if exists dream_runs_seed_check;

alter table public.dream_leaderboard_runs
  add constraint dream_runs_stage_check
  check (stage_id in ('dream-01-seraph', 'dream-02-zero-compile', 'dream-03-plush-room')) not valid;
alter table public.dream_leaderboard_runs
  add constraint dream_runs_version_check
  check (clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1', 'dream-03-v1', 'dream-03-v2')) not valid;
alter table public.dream_leaderboard_runs
  add constraint dream_runs_seed_check
  check (seed in (7130101, 7130202, 7130303)) not valid;
alter table public.dream_leaderboard_runs
  add constraint dream_runs_stage_contract_check
  check (
    (stage_id = 'dream-01-seraph' and clear_version in ('dream-01-v1', 'dream-01-v2') and seed = 7130101)
    or
    (stage_id = 'dream-02-zero-compile' and clear_version = 'dream-02-v1' and seed = 7130202)
    or
    (stage_id = 'dream-03-plush-room' and clear_version in ('dream-03-v1', 'dream-03-v2') and seed = 7130303)
  ) not valid;

alter table public.dream_leaderboard_runs validate constraint dream_runs_stage_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_version_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_seed_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_stage_contract_check;

-- Score rows have no seed, but stage/version pairs remain coupled.
alter table public.dream_leaderboard
  drop constraint if exists dream_scores_stage_contract_check;
alter table public.dream_leaderboard
  drop constraint if exists dream_scores_stage_check;
alter table public.dream_leaderboard
  drop constraint if exists dream_scores_version_check;

alter table public.dream_leaderboard
  add constraint dream_scores_stage_check
  check (stage_id in ('dream-01-seraph', 'dream-02-zero-compile', 'dream-03-plush-room')) not valid;
alter table public.dream_leaderboard
  add constraint dream_scores_version_check
  check (clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1', 'dream-03-v1', 'dream-03-v2')) not valid;
alter table public.dream_leaderboard
  add constraint dream_scores_stage_contract_check
  check (
    (stage_id = 'dream-01-seraph' and clear_version in ('dream-01-v1', 'dream-01-v2'))
    or
    (stage_id = 'dream-02-zero-compile' and clear_version = 'dream-02-v1')
    or
    (stage_id = 'dream-03-plush-room' and clear_version in ('dream-03-v1', 'dream-03-v2'))
  ) not valid;

alter table public.dream_leaderboard validate constraint dream_scores_stage_check;
alter table public.dream_leaderboard validate constraint dream_scores_version_check;
alter table public.dream_leaderboard validate constraint dream_scores_stage_contract_check;

-- Keep the first-stage schema probe stable and advance the multi-stage probe.
create or replace function public.dream_leaderboard_stage_contract()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select 'dream-03-v2'::text
$$;

revoke all on function public.dream_leaderboard_stage_contract() from public, anon, authenticated;
grant execute on function public.dream_leaderboard_stage_contract() to service_role;

comment on function public.dream_leaderboard_stage_contract() is
  'Dream leaderboard stage whitelist: dream-01 V1/V2, dream-02 V1, dream-03 V1/V2.';

commit;
