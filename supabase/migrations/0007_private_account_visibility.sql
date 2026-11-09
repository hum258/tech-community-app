-- Respect public/private profile visibility in profile and feed queries.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Users can view public profiles and their own private profile"
on public.profiles for select to authenticated
using (id = auth.uid() or is_private = false);

drop policy if exists "Authenticated users read posts" on public.posts;
create policy "Users read public posts and their own posts"
on public.posts for select to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = posts.author_id and p.is_private = false
  )
);
