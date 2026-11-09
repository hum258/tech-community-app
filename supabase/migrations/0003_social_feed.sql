-- Core social features: persistent posts, likes, comments and saved posts.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'عام',
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_created_idx on public.comments(post_id,created_at);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Authenticated users read posts" on public.posts;
create policy "Authenticated users read posts" on public.posts for select to authenticated using (true);
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts" on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Authors edit own posts" on public.posts;
create policy "Authors edit own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "Authors delete own posts" on public.posts;
create policy "Authors delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists "Users read likes" on public.post_likes;
create policy "Users read likes" on public.post_likes for select to authenticated using (true);
drop policy if exists "Users like as themselves" on public.post_likes;
create policy "Users like as themselves" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove own likes" on public.post_likes;
create policy "Users remove own likes" on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users read own saves" on public.post_saves;
create policy "Users read own saves" on public.post_saves for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users save as themselves" on public.post_saves;
create policy "Users save as themselves" on public.post_saves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove own saves" on public.post_saves;
create policy "Users remove own saves" on public.post_saves for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Authenticated users read comments" on public.comments;
create policy "Authenticated users read comments" on public.comments for select to authenticated using (true);
drop policy if exists "Users create own comments" on public.comments;
create policy "Users create own comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Authors delete own comments" on public.comments;
create policy "Authors delete own comments" on public.comments for delete to authenticated using (author_id = auth.uid());
