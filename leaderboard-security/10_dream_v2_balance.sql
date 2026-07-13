-- 梦境模式 V2 平衡版升级。
-- 依赖 09_dream_leaderboard.sql；允许 V1 与 V2 成绩并存，不删除、改写任何旧成绩。

begin;

do $$
begin
  if to_regclass('public.dream_leaderboard_runs') is null
     or to_regclass('public.dream_leaderboard') is null then
    raise exception 'Run leaderboard-security/09_dream_leaderboard.sql before 10_dream_v2_balance.sql';
  end if;
end
$$;

alter table public.dream_leaderboard_runs
  drop constraint if exists dream_runs_version_check;
alter table public.dream_leaderboard_runs
  add constraint dream_runs_version_check
  check (clear_version in ('dream-01-v1', 'dream-01-v2')) not valid;
alter table public.dream_leaderboard_runs
  validate constraint dream_runs_version_check;

alter table public.dream_leaderboard
  drop constraint if exists dream_scores_version_check;
alter table public.dream_leaderboard
  add constraint dream_scores_version_check
  check (clear_version in ('dream-01-v1', 'dream-01-v2')) not valid;
alter table public.dream_leaderboard
  validate constraint dream_scores_version_check;

-- Edge /health 通过该只读函数确认 V2 迁移已实际执行，
-- 避免只检查到表存在，却在插入 V2 令牌时被旧约束拒绝。
create or replace function public.dream_leaderboard_schema_version()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select 'dream-01-v2'::text
$$;

revoke all on function public.dream_leaderboard_schema_version() from public, anon, authenticated;
grant execute on function public.dream_leaderboard_schema_version() to service_role;

comment on function public.dream_leaderboard_schema_version() is
  'Current deployed Dream leaderboard schema contract; V1 score rows remain valid.';

commit;
