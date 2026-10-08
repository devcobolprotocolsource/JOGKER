begin;

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create unique index if not exists profiles_email_unique_idx
on public.profiles(email) where email is not null;

create or replace function create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Staff'),
    'admin'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create function set_staff_role(p_user_id uuid, p_role role_type)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  previous profiles%rowtype;
  result profiles%rowtype;
  active_super_admins bigint;
begin
  if not is_super_admin() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  perform pg_advisory_xact_lock(736381);

  select * into previous from profiles where id = p_user_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'STAFF_NOT_FOUND'; end if;
  if p_user_id = auth.uid() and previous.role <> p_role then
    raise exception using errcode = '42501', message = 'SELF_ROLE_CHANGE_FORBIDDEN';
  end if;

  if previous.role = 'super_admin' and previous.is_active and p_role <> 'super_admin' then
    select count(*) into active_super_admins
    from profiles where role = 'super_admin' and is_active;
    if active_super_admins <= 1 then
      raise exception using errcode = '42501', message = 'LAST_SUPER_ADMIN';
    end if;
  end if;

  update profiles set role = p_role where id = p_user_id returning * into result;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (
    auth.uid(),
    'staff.role.update',
    'staff',
    p_user_id::text,
    jsonb_build_object('role_before', previous.role, 'role_after', result.role)
  );
  return result;
end;
$$;

create function set_staff_active(p_user_id uuid, p_active boolean)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  previous profiles%rowtype;
  result profiles%rowtype;
  active_super_admins bigint;
begin
  if not is_super_admin() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  perform pg_advisory_xact_lock(736381);

  select * into previous from profiles where id = p_user_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'STAFF_NOT_FOUND'; end if;
  if p_user_id = auth.uid() and not p_active then
    raise exception using errcode = '42501', message = 'SELF_DEACTIVATION_FORBIDDEN';
  end if;

  if previous.role = 'super_admin' and previous.is_active and not p_active then
    select count(*) into active_super_admins
    from profiles where role = 'super_admin' and is_active;
    if active_super_admins <= 1 then
      raise exception using errcode = '42501', message = 'LAST_SUPER_ADMIN';
    end if;
  end if;

  update profiles set is_active = p_active where id = p_user_id returning * into result;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (
    auth.uid(),
    case when p_active then 'staff.activate' else 'staff.deactivate' end,
    'staff',
    p_user_id::text,
    jsonb_build_object('is_active_before', previous.is_active, 'is_active_after', result.is_active)
  );
  return result;
end;
$$;

revoke insert, update, delete on table public.profiles, public.payment_accounts
from public, anon, authenticated;
revoke all on function set_staff_role(uuid, role_type) from public, anon;
revoke all on function set_staff_active(uuid, boolean) from public, anon;
grant execute on function set_staff_role(uuid, role_type) to authenticated;
grant execute on function set_staff_active(uuid, boolean) to authenticated;

commit;
