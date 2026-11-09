-- Hardening after initial schema deployment.
-- Conversation reads/sends must be limited to the caller's own conversation membership.
drop policy if exists "Read conversation participants" on public.conversation_members;
create policy "Read own conversation participants" on public.conversation_members
for select to authenticated using (
  exists (
    select 1 from public.conversation_members mine
    where mine.conversation_id = conversation_members.conversation_id
      and mine.user_id = auth.uid()
  )
);

drop policy if exists "Read conversation messages" on public.messages;
create policy "Read conversation messages" on public.messages
for select to authenticated using (
  exists (
    select 1 from public.conversation_members mine
    where mine.conversation_id = messages.conversation_id
      and mine.user_id = auth.uid()
  )
);

drop policy if exists "Send messages in own conversations" on public.messages;
create policy "Send messages in own conversations" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_members mine
    where mine.conversation_id = messages.conversation_id
      and mine.user_id = auth.uid()
  )
);

create unique index if not exists one_pending_verification_request_per_user
on public.verification_requests(user_id) where status = 'pending';

create or replace function public.sync_verification_request_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set verification_status = 'pending', updated_at = now()
  where id = new.user_id and verification_status <> 'approved';
  return new;
end;
$$;

drop trigger if exists verification_request_sync_status on public.verification_requests;
create trigger verification_request_sync_status
after insert on public.verification_requests
for each row execute function public.sync_verification_request_status();
