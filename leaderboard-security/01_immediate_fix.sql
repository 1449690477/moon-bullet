-- 月蚀排行榜 - 01 立即止血
-- 在 Supabase SQL Editor 运行。作用：
-- 1) 删除明显注入数据；
-- 2) 补齐头像列；
-- 3) 加临时 sanity trigger，先挡住公开 key 直插超高分。

alter table public.leaderboard
  add column if not exists avatar_data text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leaderboard_avatar_data_check'
      and conrelid = 'public.leaderboard'::regclass
  ) then
    alter table public.leaderboard
      add constraint leaderboard_avatar_data_check
      check (avatar_data is null or length(avatar_data) <= 22000);
  end if;
end $$;

delete from public.leaderboard
where player_name = 'SEC_TEST'
   or score >= 99999999
   or character = 'luna';

create or replace function public.leaderboard_sanity_guard()
returns trigger
language plpgsql
as $$
begin
  if new.score is null or new.score < 0
     or new.kill_count is null or new.kill_count < 0
     or new.loop_count is null or new.loop_count < 0
     or new.bosses_cleared is null or new.bosses_cleared < 0
     or new.elapsed is null or new.elapsed < 0 then
    raise exception 'leaderboard guard: invalid numeric fields';
  end if;

  if new.character is null
     or new.character not in ('witch', 'yanuxiya', 'anna', 'reaver', 'motherlife') then
    raise exception 'leaderboard guard: invalid character %', new.character;
  end if;

  if new.player_name is null
     or length(btrim(new.player_name)) = 0
     or char_length(new.player_name) > 12 then
    raise exception 'leaderboard guard: invalid player_name';
  end if;

  if new.elapsed < 5 or new.elapsed > 7200 then
    raise exception 'leaderboard guard: elapsed out of range (%)', new.elapsed;
  end if;

  if new.avatar_data is not null and length(new.avatar_data) > 22000 then
    raise exception 'leaderboard guard: avatar too large';
  end if;

  if new.score > 5000000
     or (new.elapsed > 0 and new.score::numeric / new.elapsed > 12000)
     or (new.elapsed > 0 and new.kill_count::numeric / new.elapsed > 20)
     or new.bosses_cleared > floor(new.elapsed / 80.0) + 1
     or new.loop_count > new.bosses_cleared + 1 then
    raise exception 'leaderboard guard: score failed sanity check';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leaderboard_sanity on public.leaderboard;
create trigger trg_leaderboard_sanity
before insert or update on public.leaderboard
for each row execute function public.leaderboard_sanity_guard();

