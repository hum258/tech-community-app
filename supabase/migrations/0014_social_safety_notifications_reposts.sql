create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id) on delete cascade,actor_id uuid references public.profiles(id) on delete set null,kind text not null check(kind in ('like','comment','follow','repost','event','system')),post_id uuid references public.posts(id) on delete cascade,body text not null default '',is_read boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.user_blocks (blocker_id uuid not null references public.profiles(id) on delete cascade,blocked_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table if not exists public.content_reports (id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id) on delete cascade,post_id uuid references public.posts(id) on delete cascade,reported_user_id uuid references public.profiles(id) on delete cascade,reason text not null check(char_length(reason) between 3 and 500),status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),created_at timestamptz not null default now(),check(post_id is not null or reported_user_id is not null));
create table if not exists public.post_reposts (post_id uuid not null references public.posts(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
alter table public.notifications enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.post_reposts enable row level security;
grant select,insert,update,delete on public.notifications,public.user_blocks,public.content_reports,public.post_reposts to authenticated;
create policy "users read own notifications" on public.notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy "users update own notifications" on public.notifications for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create policy "system can create notifications" on public.notifications for insert to authenticated with check(actor_id=(select auth.uid()));
create policy "users manage own blocks" on public.user_blocks for all to authenticated using(blocker_id=(select auth.uid())) with check(blocker_id=(select auth.uid()));
create policy "users create reports" on public.content_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "users read own reports" on public.content_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy "reposts readable" on public.post_reposts for select to authenticated using(true);
create policy "users manage own reposts" on public.post_reposts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists reports_status_created_idx on public.content_reports(status,created_at);
create index if not exists reposts_post_idx on public.post_reposts(post_id);
create or replace function private.notify_post_like() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; begin select author_id into owner_id from public.posts where id=new.post_id; if owner_id is not null and owner_id<>new.user_id then insert into public.notifications(recipient_id,actor_id,kind,post_id,body) values(owner_id,new.user_id,'like',new.post_id,'أعجب بمنشورك'); end if; return new; end $$;
create or replace function private.notify_post_comment() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; begin select author_id into owner_id from public.posts where id=new.post_id; if owner_id is not null and owner_id<>new.author_id then insert into public.notifications(recipient_id,actor_id,kind,post_id,body) values(owner_id,new.author_id,'comment',new.post_id,'علّق على منشورك'); end if; return new; end $$;
create or replace function private.notify_follow() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.follower_id<>new.following_id then insert into public.notifications(recipient_id,actor_id,kind,body) values(new.following_id,new.follower_id,'follow','بدأ بمتابعتك'); end if; return new; end $$;
revoke all on function private.notify_post_like() from public,anon,authenticated;
revoke all on function private.notify_post_comment() from public,anon,authenticated;
revoke all on function private.notify_follow() from public,anon,authenticated;
create trigger notify_post_like_after_insert after insert on public.post_likes for each row execute function private.notify_post_like();
create trigger notify_post_comment_after_insert after insert on public.comments for each row execute function private.notify_post_comment();
create trigger notify_follow_after_insert after insert on public.profile_follows for each row execute function private.notify_follow();