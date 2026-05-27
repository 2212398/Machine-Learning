create extension if not exists pgcrypto;

create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_url text,
  plant_label text not null,
  disease_label text not null,
  confidence numeric(5, 4) not null default 0 check (confidence >= 0 and confidence <= 1),
  status text not null default 'completed' check (status in ('completed', 'unknown', 'failed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scan_history_user_created_at_idx
on public.scan_history (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scan_history_updated_at on public.scan_history;
create trigger set_scan_history_updated_at
before update on public.scan_history
for each row execute function public.set_updated_at();

alter table public.scan_history enable row level security;

grant select, insert, update, delete on public.scan_history to authenticated;

drop policy if exists "Scan history can read own rows" on public.scan_history;
create policy "Scan history can read own rows"
on public.scan_history
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Scan history can insert own rows" on public.scan_history;
create policy "Scan history can insert own rows"
on public.scan_history
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Scan history can update own rows" on public.scan_history;
create policy "Scan history can update own rows"
on public.scan_history
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Scan history can delete own rows" on public.scan_history;
create policy "Scan history can delete own rows"
on public.scan_history
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

