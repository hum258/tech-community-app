-- Upgrade an existing request-based installation to automatic verification.
-- Run once in Supabase SQL Editor if 0001_verification_system.sql was previously applied.

drop table if exists public.verification_requests cascade;

alter table public.profiles alter column verification_status set default 'approved';
update public.profiles
set verification_status = 'approved',
    verified_at = coalesce(verified_at, now()),
    updated_at = now();

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

comment on table public.profiles is
  'Public member profiles. Verification is automatic and free: personal=blue badge, company=silver badge.';
