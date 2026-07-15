-- 梦境模式第三关排行榜契约。
-- 依赖 09_dream_leaderboard.sql 与 10_dream_v2_balance.sql；保留前三关全部既有成绩。

begin;

do $$
begin
  if to_regclass('public.dream_leaderboard_runs') is null
     or to_regclass('public.dream_leaderboard') is null then
    raise exception 'Run leaderboard-security/09_dream_leaderboard.sql and 10_dream_v2_balance.sql before 12_dream_level_three.sql';
  end if;
end
$$;

-- 令牌表同时约束关卡、版本与种子，避免三个独立白名单被交叉组合。
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
  check (clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1', 'dream-03-v1')) not valid;
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
    (stage_id = 'dream-03-plush-room' and clear_version = 'dream-03-v1' and seed = 7130303)
  ) not valid;

alter table public.dream_leaderboard_runs validate constraint dream_runs_stage_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_version_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_seed_check;
alter table public.dream_leaderboard_runs validate constraint dream_runs_stage_contract_check;

-- 成绩表没有 seed，仍强制关卡与版本成对出现。
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
  check (clear_version in ('dream-01-v1', 'dream-01-v2', 'dream-02-v1', 'dream-03-v1')) not valid;
alter table public.dream_leaderboard
  add constraint dream_scores_stage_contract_check
  check (
    (stage_id = 'dream-01-seraph' and clear_version in ('dream-01-v1', 'dream-01-v2'))
    or
    (stage_id = 'dream-02-zero-compile' and clear_version = 'dream-02-v1')
    or
    (stage_id = 'dream-03-plush-room' and clear_version = 'dream-03-v1')
  ) not valid;

alter table public.dream_leaderboard validate constraint dream_scores_stage_check;
alter table public.dream_leaderboard validate constraint dream_scores_version_check;
alter table public.dream_leaderboard validate constraint dream_scores_stage_contract_check;

-- 保留旧 schema RPC 返回值供第一关客户端兼容，升级多关卡契约探针。
create or replace function public.dream_leaderboard_stage_contract()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select 'dream-03-v1'::text
$$;

revoke all on function public.dream_leaderboard_stage_contract() from public, anon, authenticated;
grant execute on function public.dream_leaderboard_stage_contract() to service_role;

comment on function public.dream_leaderboard_stage_contract() is
  'Dream leaderboard stage whitelist contract: dream-01 V1/V2, dream-02 V1, and dream-03 V1.';

commit;
