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

alter table storage.objects enable row level security; -- Ensure object access is enforced before policies are evaluated.

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
