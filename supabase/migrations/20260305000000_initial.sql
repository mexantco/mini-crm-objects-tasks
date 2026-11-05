-- Mini CRM: objects and tasks with RLS and status RPC

create type public.user_role as enum ('assigner', 'executor');
create type public.task_status as enum (
  'new',
  'in_progress',
  'review',
  'accepted',
  'rework'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete restrict,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  changed_by uuid not null references public.profiles (id),
  comment text,
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index task_status_history_task_id_idx on public.task_status_history (task_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger objects_set_updated_at
before update on public.objects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.is_assigner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'assigner' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.executor_has_task_on_object(p_object_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.object_id = p_object_id
      and t.assignee_id = auth.uid()
  );
$$;

create or replace function public.assignee_is_executor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'executor'
  );
$$;

create or replace function public.enforce_task_rules()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() = 'authenticated' and not public.is_assigner() then
      raise exception 'Only assigner can create tasks';
    end if;
    if new.status <> 'new' then
      raise exception 'New tasks must start as new';
    end if;
    if not public.assignee_is_executor(new.assignee_id) then
      raise exception 'Assignee must be an executor';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      if coalesce(current_setting('app.status_change', true), '') <> 'allowed' then
        raise exception 'Status must be changed via change_task_status';
      end if;
      return new;
    end if;
    if auth.role() = 'authenticated' and not public.is_assigner() then
      raise exception 'Only assigner can edit task fields';
    end if;
    if old.status = 'accepted' and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.object_id is distinct from old.object_id
      or new.assignee_id is distinct from old.assignee_id
    ) then
      raise exception 'Accepted tasks cannot be edited';
    end if;
    if not public.assignee_is_executor(new.assignee_id) then
      raise exception 'Assignee must be an executor';
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger tasks_enforce_rules
before insert or update on public.tasks
for each row execute function public.enforce_task_rules();

create or replace function public.log_initial_task_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    comment
  )
  values (new.id, null, new.status, new.author_id, null);
  return new;
end;
$$;

create trigger tasks_log_initial_status
after insert on public.tasks
for each row execute function public.log_initial_task_status();

create or replace function public.change_task_status(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
  v_role public.user_role;
  v_from public.task_status;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'Profile not found';
  end if;

  v_from := v_task.status;

  if v_from = p_to_status then
    raise exception 'Status unchanged';
  end if;

  if v_role = 'executor' and v_task.assignee_id <> auth.uid() then
    raise exception 'Not the assignee';
  end if;

  if v_role = 'assigner' then
    if not (v_from = 'review' and p_to_status in ('accepted', 'rework')) then
      raise exception 'Invalid assigner transition from % to %', v_from, p_to_status;
    end if;
    if p_to_status = 'rework' and nullif(trim(coalesce(p_comment, '')), '') is null then
      raise exception 'Comment required for rework';
    end if;
  elsif v_role = 'executor' then
    if not (
      (v_from = 'new' and p_to_status = 'in_progress')
      or (v_from = 'in_progress' and p_to_status = 'review')
      or (v_from = 'rework' and p_to_status = 'in_progress')
    ) then
      raise exception 'Invalid executor transition from % to %', v_from, p_to_status;
    end if;
  else
    raise exception 'Unknown role';
  end if;

  perform set_config('app.status_change', 'allowed', true);

  update public.tasks
  set status = p_to_status
  where id = p_task_id
  returning * into v_task;

  insert into public.task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    comment
  )
  values (
    p_task_id,
    v_from,
    p_to_status,
    auth.uid(),
    nullif(trim(coalesce(p_comment, '')), '')
  );

  return v_task;
end;
$$;

revoke all on function public.change_task_status(uuid, public.task_status, text) from public;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (true);

create policy objects_select on public.objects
for select to authenticated
using (
  public.is_assigner()
  or public.executor_has_task_on_object(id)
);

create policy objects_insert on public.objects
for insert to authenticated
with check (public.is_assigner() and created_by = auth.uid());

create policy objects_update on public.objects
for update to authenticated
using (public.is_assigner())
with check (public.is_assigner());

create policy objects_delete on public.objects
for delete to authenticated
using (public.is_assigner());

create policy tasks_select on public.tasks
for select to authenticated
using (
  public.is_assigner()
  or assignee_id = auth.uid()
);

create policy tasks_insert on public.tasks
for insert to authenticated
with check (
  public.is_assigner()
  and author_id = auth.uid()
  and status = 'new'
);

create policy tasks_update on public.tasks
for update to authenticated
using (public.is_assigner())
with check (public.is_assigner());

create policy tasks_delete on public.tasks
for delete to authenticated
using (public.is_assigner());

create policy task_history_select on public.task_status_history
for select to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and (
        public.is_assigner()
        or t.assignee_id = auth.uid()
      )
  )
);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.objects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.task_status_history to authenticated;
