-- Community membership and direct messaging foundation.
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  specialty text not null default 'عام',
  created_at timestamptz not null default now()
);
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator')),
  joined_at timestamptz not null default now(),
  primary key(community_id,user_id)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Signed in users read communities" on public.communities;
create policy "Signed in users read communities" on public.communities for select to authenticated using (true);
drop policy if exists "Users read community memberships" on public.community_members;
create policy "Users read community memberships" on public.community_members for select to authenticated using (true);
drop policy if exists "Users join as themselves" on public.community_members;
create policy "Users join as themselves" on public.community_members for insert to authenticated with check (user_id=auth.uid() and role='member');
drop policy if exists "Users leave own communities" on public.community_members;
create policy "Users leave own communities" on public.community_members for delete to authenticated using (user_id=auth.uid());

drop policy if exists "Members read conversations" on public.conversations;
create policy "Members read conversations" on public.conversations for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id=id and cm.user_id=auth.uid())
);
drop policy if exists "Users create conversations" on public.conversations;
create policy "Users create conversations" on public.conversations for insert to authenticated with check (true);
drop policy if exists "Members read participants" on public.conversation_members;
create policy "Members read participants" on public.conversation_members for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_id and cm.user_id=auth.uid())
);
drop policy if exists "Users add themselves to conversations" on public.conversation_members;
create policy "Users add themselves to conversations" on public.conversation_members for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "Conversation members read messages" on public.messages;
create policy "Conversation members read messages" on public.messages for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_id and cm.user_id=auth.uid())
);
drop policy if exists "Members send messages as themselves" on public.messages;
create policy "Members send messages as themselves" on public.messages for insert to authenticated with check (
  sender_id=auth.uid() and exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_id and cm.user_id=auth.uid())
);

insert into public.communities(name,description,specialty) values
('الأمن السيبراني','نقاشات ومصادر ومشاركة خبرات','الأمن السيبراني'),
('البرمجة وتطوير البرمجيات','تطوير الويب والتطبيقات والبرمجيات','البرمجة'),
('الذكاء الاصطناعي','تعلم الآلة وأدوات الذكاء الاصطناعي','الذكاء الاصطناعي'),
('الشبكات والبنية التحتية','الشبكات والأنظمة والحوسبة السحابية','الشبكات')
on conflict(name) do nothing;
