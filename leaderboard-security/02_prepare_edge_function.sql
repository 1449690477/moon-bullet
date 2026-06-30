-- 月蚀排行榜 - 02 部署函数前准备
-- 在部署 Edge Function 之前运行。只创建函数依赖表，不锁死 leaderboard 写权限。

create extension if not exists pgcrypto;

create table if not exists public.leaderboard_runs (
  run_id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  ip_hash text,
  ua_hash text,
  client_version text
);

create index if not exists idx_lb_runs_expires
  on public.leaderboard_runs (expires_at);

create table if not exists public.leaderboard_quarantine (
  id bigint generated always as identity primary key,
  payload jsonb not null,
  reasons text[] not null,
  created_at timestamptz not null default now(),
  ip_hash text,
  ua_hash text
);

alter table public.leaderboard
  add column if not exists avatar_data text;

