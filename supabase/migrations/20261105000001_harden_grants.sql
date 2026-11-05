-- Defense in depth: Supabase default grants give anon/authenticated ALL
-- (including TRUNCATE, which RLS does not cover). Revoke extras.

revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.objects from anon, authenticated, public;
revoke all on table public.tasks from anon, authenticated, public;
revoke all on table public.task_status_history from anon, authenticated, public;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.objects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select on table public.task_status_history to authenticated;

revoke execute on function public.is_assigner() from public, anon;
revoke execute on function public.executor_has_task_on_object(uuid) from public, anon;
revoke execute on function public.assignee_is_executor(uuid) from public, anon;
revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;

grant execute on function public.is_assigner() to authenticated;
grant execute on function public.executor_has_task_on_object(uuid) to authenticated;
grant execute on function public.assignee_is_executor(uuid) to authenticated;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_assigner()
  or exists (
    select 1
    from public.tasks t
    where t.assignee_id = auth.uid()
      and profiles.id in (t.assignee_id, t.author_id)
  )
);
