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
