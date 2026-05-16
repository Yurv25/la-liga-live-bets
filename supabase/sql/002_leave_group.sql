-- =====================================================================
-- 002_leave_group.sql
-- Run this in your Supabase SQL editor (same as 001_initial_schema.sql).
-- =====================================================================

-- 1) Ensure new signups get a profile row with a real display_name.
--    Idempotent: replaces whatever 001 created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    )
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name
    where public.profiles.display_name is null
       or public.profiles.display_name = '';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) leave_group: caller leaves; if creator leaves, transfer ownership to
--    the longest-standing remaining member, or delete the group if empty.
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_next uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select created_by into v_creator from public.groups where id = p_group_id;
  if v_creator is null then
    raise exception 'Group not found';
  end if;

  delete from public.group_members
   where group_id = p_group_id and user_id = v_uid;

  if v_creator = v_uid then
    select user_id into v_next
      from public.group_members
     where group_id = p_group_id
     order by joined_at asc
     limit 1;

    if v_next is not null then
      update public.groups set created_by = v_next where id = p_group_id;
    else
      delete from public.groups where id = p_group_id;
    end if;
  end if;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;
