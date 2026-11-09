-- Account onboarding fields and image attachments for posts.
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists is_private boolean not null default false,
  add column if not exists interests text[] not null default '{}';

alter table public.posts
  add column if not exists image_url text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id, account_type, display_name, username, date_of_birth, is_private,
    verification_status, verified_at
  )
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'account_type' = 'company'
      then 'company'::public.account_kind else 'personal'::public.account_kind end,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    coalesce((new.raw_user_meta_data ->> 'is_private')::boolean, false),
    'approved'::public.verification_state,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Post images are publicly viewable" on storage.objects;
create policy "Post images are publicly viewable"
on storage.objects for select using (bucket_id = 'post-images');

drop policy if exists "Signed in users upload their post images" on storage.objects;
create policy "Signed in users upload their post images"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own post images" on storage.objects;
create policy "Users delete their own post images"
on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
