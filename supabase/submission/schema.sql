-- Supabase schema for this project (extracted from code/supabase/migrations)
-- Generated for submission: includes tables, functions, triggers, RLS policies, and Storage bucket policies.
--
-- Recommended execution order: run this file top-to-bottom.

-- =====================================================================================
-- 001_phase1_init.sql
-- =====================================================================================
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_label text,
  disease_label text,
  plant_confidence numeric,
  disease_confidence numeric,
  status text not null,
  recommendation text,
  image_url text,
  model_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnosis_images (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  plant_label text,
  disease_label text,
  plant_confidence numeric,
  disease_confidence numeric,
  analysis_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_correct boolean,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnoses_user_id_created_at_idx on public.diagnoses (user_id, created_at desc);
create index if not exists diagnosis_images_user_id_created_at_idx on public.diagnosis_images (user_id, created_at desc);
create index if not exists feedbacks_user_id_created_at_idx on public.feedbacks (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function private.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Không được thay đổi vai trò tài khoản.';
  end if;
  return new;
end;
$$;

revoke execute on function private.prevent_profile_role_change() from public, anon, authenticated;

drop trigger if exists prevent_profiles_role_change on public.profiles;
create trigger prevent_profiles_role_change
before update of role on public.profiles
for each row execute function private.prevent_profile_role_change();

drop trigger if exists set_diagnoses_updated_at on public.diagnoses;
create trigger set_diagnoses_updated_at
before update on public.diagnoses
for each row execute function public.set_updated_at();

drop trigger if exists set_diagnosis_images_updated_at on public.diagnosis_images;
create trigger set_diagnosis_images_updated_at
before update on public.diagnosis_images
for each row execute function public.set_updated_at();

drop trigger if exists set_feedbacks_updated_at on public.feedbacks;
create trigger set_feedbacks_updated_at
before update on public.feedbacks
for each row execute function public.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    null,
    'user'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      updated_at = now();
  return new;
end;
$$;

-- Keep the security definer auth hook outside exposed schemas and callable only by the trigger.
revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();
drop function if exists public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.diagnoses enable row level security;
alter table public.diagnosis_images enable row level security;
alter table public.feedbacks enable row level security;

drop policy if exists "Profiles can read own row" on public.profiles;
create policy "Profiles can read own row"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles can update own row" on public.profiles;
create policy "Profiles can update own row"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles can insert own row" on public.profiles;
create policy "Profiles can insert own row"
on public.profiles
for insert
with check (auth.uid() = id and role = 'user');

drop policy if exists "Diagnoses can read own rows" on public.diagnoses;
create policy "Diagnoses can read own rows"
on public.diagnoses
for select
using (auth.uid() = user_id);

drop policy if exists "Diagnoses can insert own rows" on public.diagnoses;
create policy "Diagnoses can insert own rows"
on public.diagnoses
for insert
with check (auth.uid() = user_id);

drop policy if exists "Diagnoses can update own rows" on public.diagnoses;
create policy "Diagnoses can update own rows"
on public.diagnoses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Diagnoses can delete own rows" on public.diagnoses;
create policy "Diagnoses can delete own rows"
on public.diagnoses
for delete
using (auth.uid() = user_id);

drop policy if exists "Diagnosis images can read own rows" on public.diagnosis_images;
create policy "Diagnosis images can read own rows"
on public.diagnosis_images
for select
using (auth.uid() = user_id);

drop policy if exists "Diagnosis images can insert own rows" on public.diagnosis_images;
create policy "Diagnosis images can insert own rows"
on public.diagnosis_images
for insert
with check (auth.uid() = user_id);

drop policy if exists "Diagnosis images can update own rows" on public.diagnosis_images;
create policy "Diagnosis images can update own rows"
on public.diagnosis_images
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Diagnosis images can delete own rows" on public.diagnosis_images;
create policy "Diagnosis images can delete own rows"
on public.diagnosis_images
for delete
using (auth.uid() = user_id);

drop policy if exists "Feedbacks can read own rows" on public.feedbacks;
create policy "Feedbacks can read own rows"
on public.feedbacks
for select
using (auth.uid() = user_id);

drop policy if exists "Feedbacks can insert own rows" on public.feedbacks;
create policy "Feedbacks can insert own rows"
on public.feedbacks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Feedbacks can update own rows" on public.feedbacks;
create policy "Feedbacks can update own rows"
on public.feedbacks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Feedbacks can delete own rows" on public.feedbacks;
create policy "Feedbacks can delete own rows"
on public.feedbacks
for delete
using (auth.uid() = user_id);

-- =====================================================================================
-- 002_scan_history_rls.sql
-- =====================================================================================
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

-- RLS is enforced inside Postgres, so direct API calls cannot read or mutate another user's rows.
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

-- =====================================================================================
-- 003_add_diagnosis_note.sql
-- =====================================================================================
alter table public.diagnoses
add column if not exists note text;

-- =====================================================================================
-- 004_harden_auth_storage.sql
-- =====================================================================================
-- Forward migration for already-deployed databases; editing 001 alone will not re-run remotely.
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = public';
    execute 'revoke execute on function public.handle_new_user() from public, anon, authenticated';
  end if;
end;
$$;

-- Private bucket used by diagnosis uploads. Keep limits aligned with the app's 5MB validation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('leaf-uploads', 'leaf-uploads', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png'];

-- Path convention: user-id/yyyy/mm/dd/timestamp-filename.
drop policy if exists "Leaf uploads can read own objects" on storage.objects;
create policy "Leaf uploads can read own objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'leaf-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Leaf uploads can insert own objects" on storage.objects;
create policy "Leaf uploads can insert own objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'leaf-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Leaf uploads can update own objects" on storage.objects;
create policy "Leaf uploads can update own objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'leaf-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'leaf-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Leaf uploads can delete own objects" on storage.objects;
create policy "Leaf uploads can delete own objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'leaf-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- =====================================================================================
-- 005_move_auth_hook_private.sql
-- =====================================================================================
-- Move the security definer auth hook out of the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    null,
    'user'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      updated_at = now();
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

-- =====================================================================================
-- 006_lock_profile_role.sql
-- =====================================================================================
-- Prevent users from self-escalating through public.profiles.role.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Không được thay đổi vai trò tài khoản.';
  end if;
  return new;
end;
$$;

revoke execute on function private.prevent_profile_role_change() from public, anon, authenticated;

drop trigger if exists prevent_profiles_role_change on public.profiles;
create trigger prevent_profiles_role_change
before update of role on public.profiles
for each row execute function private.prevent_profile_role_change();

drop policy if exists "Profiles can insert own row" on public.profiles;
create policy "Profiles can insert own row"
on public.profiles
for insert
with check (auth.uid() = id and role = 'user');
