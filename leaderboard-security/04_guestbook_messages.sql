-- 月蚀留言板：公开读取，写入只走 Edge Function。
-- 运行时机：部署包含 /message 路由的 leaderboard-run 函数前后均可。

create table if not exists public.guestbook_messages (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL CHECK (char_length(player_id) BETWEEN 1 AND 16),
  player_name TEXT NOT NULL DEFAULT '匿名玩家' CHECK (char_length(player_name) BETWEEN 1 AND 12),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 96),
  avatar_data TEXT CHECK (avatar_data IS NULL OR length(avatar_data) <= 22000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

create index if not exists idx_guestbook_messages_created_at
  on public.guestbook_messages (created_at DESC);

alter table public.guestbook_messages enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guestbook_messages'
  loop
    execute format('drop policy if exists %I on public.guestbook_messages', p.policyname);
  end loop;
end $$;

create policy "public read guestbook messages"
  on public.guestbook_messages
  for select
  to anon, authenticated
  using (true);

grant select on public.guestbook_messages to anon, authenticated;
revoke insert, update, delete on public.guestbook_messages from anon, authenticated;
