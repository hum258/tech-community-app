-- TECH COMMUNITY: automatic free verification at account creation.
-- Personal accounts receive a blue badge; company accounts receive a silver badge.
-- No application, review queue, or paid verification.

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_kind as enum ('personal', 'company');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_state as enum ('not_requested', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type public.account_kind not null default 'personal',
  display_name text not null default '',
  username text unique,
  bio text not null default '',
  specialty text,
  avatar_url text,
  verification_status public.verification_state not null default 'approved',
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_at_matches_status check (
    (verification_status = 'approved' and verified_at is not null)
    or (verification_status <> 'approved' and verified_at is null)
  )
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, account_type, display_name, verification_status, verified_at)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'account_type' = 'company'
      then 'company'::public.account_kind else 'personal'::public.account_kind end,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'approved'::public.verification_state,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
on public.profiles for select to authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_profile_verification_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.verification_status is distinct from old.verification_status
      or new.verified_at is distinct from old.verified_at
      or new.account_type is distinct from old.account_type then
      raise exception 'Verification and account type are assigned by the registration service';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_profile_verification on public.profiles;
create trigger protect_profile_verification before update on public.profiles
for each row execute procedure public.protect_profile_verification_fields();

comment on table public.profiles is
  'Public member profiles. Verification is automatic and free: personal=blue badge, company=silver badge.';
