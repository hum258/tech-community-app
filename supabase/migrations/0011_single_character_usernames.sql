-- Allow 1-character usernames while enforcing case-insensitive uniqueness.
create unique index if not exists profiles_username_lower_uidx
on public.profiles (lower(username))
where username is not null;

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(candidate))
  );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
