create extension if not exists pgcrypto;

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

create or replace function public.handle_new_user()
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
with check (auth.uid() = id);

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