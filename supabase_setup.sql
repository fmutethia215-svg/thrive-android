-- Thrive: Supabase database setup
-- Run in Supabase Dashboard -> SQL Editor. This table stores each user's app data in one JSONB payload.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Start from no broad access; allow authenticated users to operate only on their own row.
revoke all on table public.user_data from anon, authenticated;
grant select, insert, update, delete on table public.user_data to authenticated;

drop policy if exists "Users can read own Thrive data" on public.user_data;
create policy "Users can read own Thrive data"
  on public.user_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own Thrive data" on public.user_data;
create policy "Users can insert own Thrive data"
  on public.user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own Thrive data" on public.user_data;
create policy "Users can update own Thrive data"
  on public.user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own Thrive data" on public.user_data;
create policy "Users can delete own Thrive data"
  on public.user_data for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Optional: enable live cross-device refresh for the app's own data table.
-- This is idempotent and can be run with the setup above.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table public.user_data;
  end if;
end $$;
