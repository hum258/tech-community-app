-- Analytics, topic discovery, message receipts, comment threading and creator points
create table if not exists public.post_views (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 viewed_on date not null default current_date,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id,viewed_on)
);
alter table public.post_views enable row level security;
grant select,insert on public.post_views to authenticated;
drop policy if exists "users record one daily view" on public.post_views;
create policy "users record one daily view" on public.post_views for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.author_id<>(select auth.uid())));
drop policy if exists "authors read post views" on public.post_views;
create policy "authors read post views" on public.post_views for select to authenticated
using(exists(select 1 from public.posts p where p.id=post_id and p.author_id=(select auth.uid())));
alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;
create table if not exists public.comment_likes (
 comment_id uuid not null references public.comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(comment_id,user_id)
);
alter table public.comment_likes enable row level security;
grant select,insert,delete on public.comment_likes to authenticated;
drop policy if exists "comment likes visible to signed users" on public.comment_likes;
create policy "comment likes visible to signed users" on public.comment_likes for select to authenticated using(true);
drop policy if exists "users manage own comment likes" on public.comment_likes;
create policy "users manage own comment likes" on public.comment_likes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.posts add column if not exists pinned_at timestamptz;
alter table public.profiles add column if not exists points integer not null default 0;
create table if not exists public.topics (id uuid primary key default gen_random_uuid(),name text not null unique,category text not null default 'تقنية',created_at timestamptz not null default now());
create table if not exists public.profile_topic_follows (user_id uuid not null references public.profiles(id) on delete cascade,topic_id uuid not null references public.topics(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,topic_id));
alter table public.topics enable row level security;
alter table public.profile_topic_follows enable row level security;
grant select on public.topics to authenticated;
grant select,insert,delete on public.profile_topic_follows to authenticated;
drop policy if exists "topics visible to authenticated" on public.topics;
create policy "topics visible to authenticated" on public.topics for select to authenticated using(true);
drop policy if exists "topic follows visible to authenticated" on public.profile_topic_follows;
create policy "topic follows visible to authenticated" on public.profile_topic_follows for select to authenticated using(true);
drop policy if exists "users manage own topic follows" on public.profile_topic_follows;
create policy "users manage own topic follows" on public.profile_topic_follows for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
insert into public.topics(name,category) values ('الأمن السيبراني','أمن'),('الذكاء الاصطناعي','تقنية'),('البرمجة','تقنية'),('الشبكات','تقنية'),('تطوير التطبيقات','تقنية'),('الحوسبة السحابية','تقنية'),('تحليل البيانات','تقنية'),('التصميم','إبداع') on conflict(name) do nothing;
create index if not exists post_views_post_idx on public.post_views(post_id,viewed_on);
create index if not exists comments_parent_idx on public.comments(parent_comment_id);
create or replace function public.get_post_metrics(post_ids uuid[])
returns table(post_id uuid,views bigint,likes bigint,comments bigint,reposts bigint,saves bigint)
language sql security definer set search_path='' as $$
 select p.id,(select count(*) from public.post_views v where v.post_id=p.id),(select count(*) from public.post_likes l where l.post_id=p.id),(select count(*) from public.comments c where c.post_id=p.id),(select count(*) from public.post_reposts r where r.post_id=p.id),(select count(*) from public.post_saves s where s.post_id=p.id)
 from public.posts p where p.id=any(post_ids)
$$;
revoke all on function public.get_post_metrics(uuid[]) from public,anon;
grant execute on function public.get_post_metrics(uuid[]) to authenticated;
create or replace function public.mark_conversation_read(conversation uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.conversation_members m where m.conversation_id=conversation and m.user_id=auth.uid()) then raise exception 'Not a conversation member'; end if;
 update public.messages set read_at=now() where conversation_id=conversation and sender_id<>auth.uid() and read_at is null;
end $$;
revoke all on function public.mark_conversation_read(uuid) from public,anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
create or replace function private.award_post_points() returns trigger language plpgsql security definer set search_path='' as $$ begin update public.profiles set points=points+5 where id=new.author_id; return new; end $$;
create or replace function private.award_comment_points() returns trigger language plpgsql security definer set search_path='' as $$ begin update public.profiles set points=points+2 where id=new.author_id; return new; end $$;
revoke all on function private.award_post_points() from public,anon,authenticated;
revoke all on function private.award_comment_points() from public,anon,authenticated;
drop trigger if exists award_points_for_post on public.posts;
create trigger award_points_for_post after insert on public.posts for each row execute function private.award_post_points();
drop trigger if exists award_points_for_comment on public.comments;
create trigger award_points_for_comment after insert on public.comments for each row execute function private.award_comment_points();