-- Community feature hub schema. RLS and explicit grants are required because
-- new public-schema tables are not automatically exposed by the Data API.
create table if not exists public.follow_lists (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, name text not null check(char_length(name) between 1 and 60), description text not null default '', created_at timestamptz not null default now());
create table if not exists public.follow_list_members (list_id uuid not null references public.follow_lists(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(list_id,profile_id));
create table if not exists public.polls (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, question text not null check(char_length(question) between 3 and 300), closes_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.poll_options (id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.polls(id) on delete cascade, label text not null check(char_length(label) between 1 and 120), position int not null default 0);
create table if not exists public.poll_votes (poll_id uuid not null references public.polls(id) on delete cascade, option_id uuid not null references public.poll_options(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(poll_id,user_id));
create table if not exists public.post_drafts (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null default '', body text not null default '', category text not null default 'عام', image_url text, updated_at timestamptz not null default now());
create table if not exists public.scheduled_posts (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null default '', body text not null, category text not null default 'عام', image_url text, scheduled_at timestamptz not null, published_post_id uuid references public.posts(id) on delete set null, status text not null default 'pending' check(status in ('pending','published','cancelled','failed')), created_at timestamptz not null default now());
create table if not exists public.achievements (id uuid primary key default gen_random_uuid(), code text not null unique, title text not null, description text not null default '', icon text not null default 'trophy', created_at timestamptz not null default now());
create table if not exists public.user_achievements (user_id uuid not null references public.profiles(id) on delete cascade, achievement_id uuid not null references public.achievements(id) on delete cascade, awarded_at timestamptz not null default now(), primary key(user_id,achievement_id));
create table if not exists public.learning_paths (id uuid primary key default gen_random_uuid(), title text not null, category text not null, description text not null default '', lessons jsonb not null default '[]'::jsonb, is_published boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.learning_path_progress (user_id uuid not null references public.profiles(id) on delete cascade, path_id uuid not null references public.learning_paths(id) on delete cascade, completed_lessons jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now(), primary key(user_id,path_id));
create table if not exists public.questions (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade, title text not null check(char_length(title) between 5 and 180), body text not null default '', category text not null default 'عام', accepted_answer_id uuid, created_at timestamptz not null default now());
create table if not exists public.answers (id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete cascade, author_id uuid not null references public.profiles(id) on delete cascade, body text not null check(char_length(body) between 1 and 5000), created_at timestamptz not null default now());
alter table public.questions add constraint questions_accepted_answer_fk foreign key(accepted_answer_id) references public.answers(id) on delete set null;
create table if not exists public.profile_portfolio_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null check(char_length(title) between 1 and 100), description text not null default '', item_type text not null default 'project' check(item_type in ('skill','project','certificate','link')), url text, created_at timestamptz not null default now());
create table if not exists public.events (id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id) on delete cascade, title text not null check(char_length(title) between 3 and 140), description text not null default '', starts_at timestamptz not null, location text not null default 'عن بُعد', created_at timestamptz not null default now());
create table if not exists public.event_registrations (event_id uuid not null references public.events(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, registered_at timestamptz not null default now(), primary key(event_id,user_id));
create table if not exists public.audio_rooms (id uuid primary key default gen_random_uuid(), host_id uuid not null references public.profiles(id) on delete cascade, title text not null check(char_length(title) between 3 and 120), status text not null default 'scheduled' check(status in ('scheduled','live','ended')), starts_at timestamptz not null default now(), created_at timestamptz not null default now());
create table if not exists public.audio_room_participants (room_id uuid not null references public.audio_rooms(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role text not null default 'listener' check(role in ('listener','speaker')), joined_at timestamptz not null default now(), primary key(room_id,user_id));
do $$ declare t text; begin
 foreach t in array array['follow_lists','follow_list_members','polls','poll_options','poll_votes','post_drafts','scheduled_posts','achievements','user_achievements','learning_paths','learning_path_progress','questions','answers','profile_portfolio_items','events','event_registrations','audio_rooms','audio_room_participants'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant select on public.%I to anon',t);
 end loop;
end $$;
create policy "list owners manage lists" on public.follow_lists for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "list owners manage members" on public.follow_list_members for all to authenticated using(exists(select 1 from public.follow_lists l where l.id=list_id and l.owner_id=(select auth.uid()))) with check(exists(select 1 from public.follow_lists l where l.id=list_id and l.owner_id=(select auth.uid())));
create policy "polls readable" on public.polls for select to anon,authenticated using(true);
create policy "authors manage polls" on public.polls for all to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "poll options readable" on public.poll_options for select to anon,authenticated using(true);
create policy "poll authors manage options" on public.poll_options for all to authenticated using(exists(select 1 from public.polls p where p.id=poll_id and p.author_id=(select auth.uid()))) with check(exists(select 1 from public.polls p where p.id=poll_id and p.author_id=(select auth.uid())));
create policy "votes readable" on public.poll_votes for select to authenticated using(true);
create policy "users vote as themselves" on public.poll_votes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.poll_options o where o.id=option_id and o.poll_id=poll_id));
create policy "users remove own vote" on public.poll_votes for delete to authenticated using(user_id=(select auth.uid()));
create policy "owners manage drafts" on public.post_drafts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "owners manage scheduled posts" on public.scheduled_posts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "achievements readable" on public.achievements for select to anon,authenticated using(true);
create policy "users read own achievements" on public.user_achievements for select to authenticated using(user_id=(select auth.uid()));
create policy "published learning paths readable" on public.learning_paths for select to anon,authenticated using(is_published=true);
create policy "users manage own learning progress" on public.learning_path_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "questions readable" on public.questions for select to anon,authenticated using(true);
create policy "users create questions" on public.questions for insert to authenticated with check(author_id=(select auth.uid()));
create policy "authors update questions" on public.questions for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "authors delete questions" on public.questions for delete to authenticated using(author_id=(select auth.uid()));
create policy "answers readable" on public.answers for select to anon,authenticated using(true);
create policy "users create answers" on public.answers for insert to authenticated with check(author_id=(select auth.uid()));
create policy "authors manage own answers" on public.answers for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "authors delete own answers" on public.answers for delete to authenticated using(author_id=(select auth.uid()));
create policy "portfolio readable" on public.profile_portfolio_items for select to anon,authenticated using(true);
create policy "users manage own portfolio" on public.profile_portfolio_items for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "events readable" on public.events for select to anon,authenticated using(true);
create policy "creators manage events" on public.events for all to authenticated using(creator_id=(select auth.uid())) with check(creator_id=(select auth.uid()));
create policy "registrations readable to owner" on public.event_registrations for select to authenticated using(user_id=(select auth.uid()));
create policy "users register themselves" on public.event_registrations for insert to authenticated with check(user_id=(select auth.uid()));
create policy "users cancel own registration" on public.event_registrations for delete to authenticated using(user_id=(select auth.uid()));
create policy "audio rooms readable" on public.audio_rooms for select to anon,authenticated using(true);
create policy "hosts manage rooms" on public.audio_rooms for all to authenticated using(host_id=(select auth.uid())) with check(host_id=(select auth.uid()));
create policy "room participants readable" on public.audio_room_participants for select to authenticated using(true);
create policy "users join rooms as listeners" on public.audio_room_participants for insert to authenticated with check(user_id=(select auth.uid()) and role='listener');
create policy "hosts manage room participants" on public.audio_room_participants for update to authenticated using(exists(select 1 from public.audio_rooms r where r.id=room_id and r.host_id=(select auth.uid()))) with check(exists(select 1 from public.audio_rooms r where r.id=room_id and r.host_id=(select auth.uid())));
create policy "users leave rooms" on public.audio_room_participants for delete to authenticated using(user_id=(select auth.uid()));
create index if not exists follow_lists_owner_idx on public.follow_lists(owner_id);
create index if not exists polls_author_idx on public.polls(author_id);
create index if not exists drafts_user_idx on public.post_drafts(user_id);
create index if not exists scheduled_due_idx on public.scheduled_posts(status,scheduled_at);
create index if not exists questions_created_idx on public.questions(created_at desc);
create index if not exists answers_question_idx on public.answers(question_id);
create index if not exists portfolio_user_idx on public.profile_portfolio_items(user_id);
create index if not exists events_start_idx on public.events(starts_at);
create index if not exists audio_rooms_start_idx on public.audio_rooms(starts_at);

-- Award achievements through private trigger functions, not client-writable endpoints.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.award_first_question() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 insert into public.user_achievements(user_id,achievement_id)
 select new.author_id,a.id from public.achievements a where a.code='first_question'
 on conflict do nothing;
 return new;
end $$;
revoke all on function private.award_first_question() from public, anon, authenticated;
create trigger award_first_question_after_insert after insert on public.questions
for each row execute function private.award_first_question();
create or replace function private.award_learning_starter() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 insert into public.user_achievements(user_id,achievement_id)
 select new.user_id,a.id from public.achievements a where a.code='learning_starter'
 on conflict do nothing;
 return new;
end $$;
revoke all on function private.award_learning_starter() from public, anon, authenticated;
create trigger award_learning_starter_after_insert after insert on public.learning_path_progress
for each row execute function private.award_learning_starter();
create or replace function private.award_community_member() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 insert into public.user_achievements(user_id,achievement_id)
 select new.user_id,a.id from public.achievements a where a.code='community_member'
 on conflict do nothing;
 return new;
end $$;
revoke all on function private.award_community_member() from public, anon, authenticated;
create trigger award_community_member_after_insert after insert on public.community_members
for each row execute function private.award_community_member();

-- Speaker requests are separate from listener membership and require host approval.
create table if not exists public.audio_room_speaker_requests (
 room_id uuid not null references public.audio_rooms(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
alter table public.audio_room_speaker_requests enable row level security;
grant select,insert,update,delete on public.audio_room_speaker_requests to authenticated;
create policy "participants and hosts read speaker requests" on public.audio_room_speaker_requests for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.audio_rooms r where r.id=room_id and r.host_id=(select auth.uid())));
create policy "users request speaking for themselves" on public.audio_room_speaker_requests for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending');
create policy "hosts review speaker requests" on public.audio_room_speaker_requests for update to authenticated
using(exists(select 1 from public.audio_rooms r where r.id=room_id and r.host_id=(select auth.uid())))
with check(exists(select 1 from public.audio_rooms r where r.id=room_id and r.host_id=(select auth.uid())));
create index if not exists audio_speaker_requests_room_idx on public.audio_room_speaker_requests(room_id,status);
