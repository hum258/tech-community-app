create table if not exists public.profile_skill_endorsements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endorser_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null check (length(trim(skill_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique(profile_id, endorser_id, skill_name),
  check (profile_id <> endorser_id)
);
alter table public.profile_skill_endorsements enable row level security;
create policy "Skill endorsements are readable" on public.profile_skill_endorsements for select to authenticated using (true);
create policy "Users endorse skills as themselves" on public.profile_skill_endorsements for insert to authenticated with check (endorser_id = (select auth.uid()) and profile_id <> (select auth.uid()));
create policy "Users remove own skill endorsements" on public.profile_skill_endorsements for delete to authenticated using (endorser_id = (select auth.uid()));

create table if not exists public.tech_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  description text not null default '',
  opportunity_type text not null default 'training',
  location text,
  application_url text,
  created_at timestamptz not null default now()
);
alter table public.tech_opportunities enable row level security;
create policy "Opportunities are readable" on public.tech_opportunities for select to authenticated using (true);
create policy "Owners create opportunities" on public.tech_opportunities for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update opportunities" on public.tech_opportunities for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete opportunities" on public.tech_opportunities for delete to authenticated using (owner_id = (select auth.uid()));

create table if not exists public.project_collaborations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  description text not null default '',
  skills_needed text[] not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.project_collaborations enable row level security;
create policy "Project collaborations are readable" on public.project_collaborations for select to authenticated using (true);
create policy "Owners create collaborations" on public.project_collaborations for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update collaborations" on public.project_collaborations for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete collaborations" on public.project_collaborations for delete to authenticated using (owner_id = (select auth.uid()));

create table if not exists public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (length(trim(topic)) between 1 and 140),
  message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  check (mentor_id <> requester_id)
);
alter table public.mentorship_requests enable row level security;
create policy "Participants read mentorship requests" on public.mentorship_requests for select to authenticated using (mentor_id = (select auth.uid()) or requester_id = (select auth.uid()));
create policy "Users request mentorship" on public.mentorship_requests for insert to authenticated with check (requester_id = (select auth.uid()) and mentor_id <> (select auth.uid()));
create policy "Mentors update mentorship requests" on public.mentorship_requests for update to authenticated using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));

create table if not exists public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  project_owner_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  project_title text not null check (length(trim(project_title)) between 1 and 140),
  project_url text,
  feedback text not null check (length(trim(feedback)) between 1 and 4000),
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  check (project_owner_id <> reviewer_id)
);
alter table public.project_reviews enable row level security;
create policy "Project reviews are readable" on public.project_reviews for select to authenticated using (true);
create policy "Users submit project reviews" on public.project_reviews for insert to authenticated with check (reviewer_id = (select auth.uid()) and project_owner_id <> (select auth.uid()));
create policy "Reviewers delete own reviews" on public.project_reviews for delete to authenticated using (reviewer_id = (select auth.uid()));
