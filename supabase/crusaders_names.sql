-- Crusaders: every combination of name and origin exists only once, for everyone.
-- Run once in the Supabase SQL editor; then set window.CRUSADERS_REGISTER = { url, key }
-- (project URL and anon key) in public/crusaders/index.html.
create table if not exists public.crusaders_names (
  name       text        not null,
  origin     text        not null,
  sex        text        check (sex in ('f', 'm')),
  created_at timestamptz not null default now(),
  primary key (name, origin)
);
alter table public.crusaders_names enable row level security;
-- anyone may claim a free name (a taken one fails with 409); nobody can read, change or delete others
create policy "claim a name" on public.crusaders_names for insert to anon with check (true);
