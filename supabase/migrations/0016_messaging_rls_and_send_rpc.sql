-- Repair recursive conversation-member RLS and provide a safe direct-message RPC.
create or replace function public.is_conversation_member(target_conversation uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation
      and cm.user_id = target_user
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists "Read own conversation participants" on public.conversation_members;
drop policy if exists "Members read participants" on public.conversation_members;
create policy "Read participants in own conversations"
on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "Read conversation messages" on public.messages;
drop policy if exists "Conversation members read messages" on public.messages;
create policy "Read messages in own conversations"
on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "Send messages in own conversations" on public.messages;
drop policy if exists "Members send messages as themselves" on public.messages;
create policy "Send messages in own conversations"
on public.messages for insert to authenticated
with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

create or replace function public.send_conversation_message(conversation uuid, message_body text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.messages;
  sender uuid := auth.uid();
begin
  if sender is null then
    raise exception 'Authentication required';
  end if;
  if message_body is null or length(trim(message_body)) < 1 or length(message_body) > 5000 then
    raise exception 'Message must contain 1 to 5000 characters';
  end if;
  if not public.is_conversation_member(conversation, sender) then
    raise exception 'You are not a member of this conversation';
  end if;
  insert into public.messages(conversation_id, sender_id, body)
  values (conversation, sender, trim(message_body))
  returning * into result;
  return result;
end;
$$;

revoke all on function public.send_conversation_message(uuid, text) from public;
grant execute on function public.send_conversation_message(uuid, text) to authenticated;

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select on public.conversation_members to authenticated;
