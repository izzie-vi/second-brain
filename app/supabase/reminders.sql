-- Phone reminders for fixed dates. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Do this after creating the "remind" Edge Function (see supabase/remind/index.ts).

-- each phone that turned reminders on (only you can see or change your own)
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  sub        jsonb not null,
  tz         text not null default 'UTC',
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own subs: read"   on public.push_subs;
drop policy if exists "own subs: add"    on public.push_subs;
drop policy if exists "own subs: change" on public.push_subs;
drop policy if exists "own subs: remove" on public.push_subs;
create policy "own subs: read"   on public.push_subs for select using (auth.uid() = user_id);
create policy "own subs: add"    on public.push_subs for insert with check (auth.uid() = user_id);
create policy "own subs: change" on public.push_subs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subs: remove" on public.push_subs for delete using (auth.uid() = user_id);

-- reminders already sent, so none goes out twice; and the keys that sign them. Only the function reads these.
create table if not exists public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_sent enable row level security;
create table if not exists public.push_keys (
  id          int primary key default 1,
  public_key  text not null,
  private_key text not null
);
alter table public.push_keys enable row level security;

-- run the function five minutes past every hour
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('notebook-reminders') where exists (select 1 from cron.job where jobname = 'notebook-reminders');
select cron.schedule('notebook-reminders', '5 * * * *', $$
  select net.http_post(
    url     := 'https://hiekmtztmzkhduvbfvcu.supabase.co/functions/v1/remind',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZWttdHp0bXpraGR1dmJmdmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1ODY0MTEsImV4cCI6MjEwNzE2MjQxMX0.Ou9Q38AXjwfd_o5M3pcvNP3k39UAVCQArfOM2aQ5zfQ"}'::jsonb,
    body    := '{"op": "run"}'::jsonb
  );
$$);

-- tidy up: forget sent reminders after 60 days
select cron.unschedule('notebook-reminders-tidy') where exists (select 1 from cron.job where jobname = 'notebook-reminders-tidy');
select cron.schedule('notebook-reminders-tidy', '30 3 * * *', $$ delete from public.push_sent where sent_at < now() - interval '60 days' $$);
