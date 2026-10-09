-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One row per person holds all their notebook data. Only that person can read or change it.

create table if not exists public.brain (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.brain enable row level security;

drop policy if exists "own row: read"   on public.brain;
drop policy if exists "own row: add"    on public.brain;
drop policy if exists "own row: change" on public.brain;
create policy "own row: read"   on public.brain for select using (auth.uid() = user_id);
create policy "own row: add"    on public.brain for insert with check (auth.uid() = user_id);
create policy "own row: change" on public.brain for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- lets the other device hear about changes right away
do $$ begin
  alter publication supabase_realtime add table public.brain;
exception when duplicate_object then null; end $$;
