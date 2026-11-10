create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;

drop policy if exists "users read own blocks" on public.user_blocks;
create policy "users read own blocks" on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "users create own blocks" on public.user_blocks;
create policy "users create own blocks" on public.user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "users remove own blocks" on public.user_blocks;
create policy "users remove own blocks" on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

create index if not exists user_blocks_blocked_idx
  on public.user_blocks(blocked_id);
