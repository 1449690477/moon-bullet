-- 月蚀排行榜 · 新赛季清榜 + 取消旧分数速度限制
-- 在 Supabase SQL Editor 以 postgres 身份执行。

-- 1) 可选：把当前榜单归档到数据库里的历史表。
create table if not exists public.leaderboard_history (
  season_id text not null,
  archived_at timestamptz not null default now(),
  source_id bigint,
  player_name text,
  character text,
  score bigint,
  kill_count integer,
  loop_count integer,
  elapsed integer,
  bosses_cleared integer,
  created_at timestamptz
);

insert into public.leaderboard_history (
  season_id, source_id, player_name, character, score, kill_count,
  loop_count, elapsed, bosses_cleared, created_at
)
select
  'season-2026-07-05-pre-reset',
  id, player_name, character, score, kill_count,
  loop_count, elapsed, bosses_cleared, created_at
from public.leaderboard;

-- 2) 新赛季清零：保留玩家 ID / 昵称 / 角色记录，只清成绩字段。
update public.leaderboard
set score = 0,
    kill_count = 0,
    loop_count = 0,
    bosses_cleared = 0;

-- 3) 重建表触发器：保留基础 sanity check，但取消 score / elapsed 阈值。
create or replace function public.leaderboard_sanity_guard()
returns trigger
language plpgsql
as $$
begin
  if NEW.player_name is null
     or char_length(NEW.player_name) < 1
     or char_length(NEW.player_name) > 24 then
    raise exception 'leaderboard guard: invalid player_name';
  end if;

  if NEW.elapsed < 0 or NEW.elapsed > 7200 then
    raise exception 'leaderboard guard: elapsed out of range (%)', NEW.elapsed;
  end if;

  if (NEW.elapsed > 0 and NEW.kill_count::numeric / greatest(NEW.elapsed, 1) > 20)
     or NEW.bosses_cleared > floor(greatest(NEW.elapsed, 1) / 80.0) + 1
     or NEW.loop_count > NEW.bosses_cleared + 1 then
    raise exception 'leaderboard guard: score failed sanity check';
  end if;

  return NEW;
end;
$$;
