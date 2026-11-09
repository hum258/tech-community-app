-- TECH COMMUNITY: real verification workflow (Supabase / PostgreSQL)
-- Run this in Supabase SQL Editor after creating a Supabase project.
-- Verification is free. Personal = blue badge; company = silver badge.
-- A badge is granted ONLY after an administrator approves the request.

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
  verification_status public.verification_state not null default 'not_requested',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_at_matches_status check (
    (verification_status = 'approved' and verified_at is not null)
    or (verification_status <> 'approved' and verified_at is null)
  )
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_type public.account_kind not null,
  applicant_name text not null,
  reason text not null,
  evidence_url text,
  status public.verification_state not null default 'pending',
  reviewer_id uuid references auth.users(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint verification_review_consistency check (
    (status in ('approved', 'rejected') and reviewed_at is not null and reviewer_id is not null)
    or (status in ('pending', 'not_requested') and reviewed_at is null)
  )
);

create index if not exists verification_requests_user_created_idx
  on public.verification_requests(user_id, created_at desc);
create unique index if not exists one_pending_verification_per_user
  on public.verification_requests(user_id) where status = 'pending';

-- Keep profile creation tied to Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, account_type, display_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'account_type' = 'company'
      then 'company'::public.account_kind else 'personal'::public.account_kind end,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.verification_requests enable row level security;

-- Authenticated users can view public profile fields.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

-- A user can edit their own non-verification profile fields.
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent clients from self-assigning a badge or changing verification status.
create or replace function public.protect_profile_verification_fields()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.verification_status is distinct from old.verification_status
      or new.verified_at is distinct from old.verified_at then
      raise exception 'Verification status can only be changed by an administrator';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_profile_verification on public.profiles;
create trigger protect_profile_verification
  before update on public.profiles
  for each row execute procedure public.protect_profile_verification_fields();

-- Applicants can submit and read their own requests; no client-side approval policy exists.
drop policy if exists "Users read own verification requests" on public.verification_requests;
create policy "Users read own verification requests"
  on public.verification_requests for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users submit own verification requests" on public.verification_requests;
create policy "Users submit own verification requests"
  on public.verification_requests for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and reviewer_id is null
    and reviewed_at is null
    and reviewer_note is null
    and account_type = (select p.account_type from public.profiles p where p.id = auth.uid())
  );

-- Only trusted server/admin code using the service role should approve/reject.
-- Never expose the Supabase service_role key in the mobile app.
-- The admin dashboard will use a server-side endpoint to update requests and profiles
-- atomically after checking the user's app_metadata.role = 'admin'.

comment on table public.verification_requests is
  'Free verification review queue. Approved personal accounts receive blue badge; companies receive silver badge.';
