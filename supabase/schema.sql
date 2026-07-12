-- Praktika — Supabase schema.
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

create table if not exists public.progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id text        not null,
  status      text        not null check (status in ('new', 'learning', 'learned')),
  reviews     integer     not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Each user may only read/write their own rows.
alter table public.progress enable row level security;

drop policy if exists "Users manage own progress" on public.progress;
create policy "Users manage own progress"
  on public.progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
