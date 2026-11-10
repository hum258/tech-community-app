-- Make the post analytics viewer metric represent distinct accounts, not daily view rows.
create or replace function public.get_post_metrics(post_ids uuid[])
returns table(post_id uuid,views bigint,likes bigint,comments bigint,reposts bigint,saves bigint,shares bigint)
language sql
security definer
set search_path=''
as $$
  select
    p.id,
    (select count(distinct v.user_id) from public.post_views v where v.post_id=p.id),
    (select count(*) from public.post_likes l where l.post_id=p.id),
    (select count(*) from public.comments c where c.post_id=p.id),
    (select count(*) from public.post_reposts r where r.post_id=p.id),
    (select count(*) from public.post_saves s where s.post_id=p.id),
    (select count(*) from public.post_shares h where h.post_id=p.id)
  from public.posts p
  where p.id=any(post_ids)
$$;

revoke all on function public.get_post_metrics(uuid[]) from public,anon;
grant execute on function public.get_post_metrics(uuid[]) to authenticated;
