-- 月蚀排行榜 - 03 正式 RLS 加固
-- 顺序：01 -> 02 -> deploy Edge Function -> push Pages -> 03。
-- 运行后公开 key 只能读榜，写入只能经 Edge Function service_role。

alter table public.leaderboard enable row level security;
alter table public.leaderboard_runs enable row level security;
alter table public.leaderboard_quarantine enable row level security;

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('leaderboard', 'leaderboard_runs', 'leaderboard_quarantine')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "public read leaderboard"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

grant select on public.leaderboard to anon, authenticated;
revoke insert, update, delete on public.leaderboard from anon, authenticated;

revoke all on public.leaderboard_runs from anon, authenticated;
revoke all on public.leaderboard_quarantine from anon, authenticated;
