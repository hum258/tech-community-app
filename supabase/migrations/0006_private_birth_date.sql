-- Move birth dates out of public profiles into a self-only table.
create table if not exists public.account_private_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  created_at timestamptz not null default now()
);
alter table public.account_private_details enable row level security;

drop policy if exists "Users read own private account details" on public.account_private_details;
create policy "Users read own private account details" on public.account_private_details
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users insert own private account details" on public.account_private_details;
create policy "Users insert own private account details" on public.account_private_details
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own private account details" on public.account_private_details;
create policy "Users update own private account details" on public.account_private_details
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.account_private_details(user_id, date_of_birth)
select id, date_of_birth from public.profiles where date_of_birth is not null
on conflict (user_id) do update set date_of_birth = excluded.date_of_birth;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id, account_type, display_name, username, is_private,
    verification_status, verified_at
  )
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'account_type' = 'company'
      then 'company'::public.account_kind else 'personal'::public.account_kind end,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
    coalesce((new.raw_user_meta_data ->> 'is_private')::boolean, false),
    'approved'::public.verification_state,
    now()
  )
  on conflict (id) do nothing;

  insert into public.account_private_details(user_id, date_of_birth)
  values (new.id, nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter table public.profiles drop column if exists date_of_birth;
