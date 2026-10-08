begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data) values
  ('90000000-0000-4000-8000-000000000001', 'admin-security@jokger.local', '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000002', 'super-security@jokger.local', '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000003', 'super-two-security@jokger.local', '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000004', 'target-security@jokger.local', '{}'::jsonb)
on conflict (id) do nothing;
update profiles set role = 'super_admin' where id in (
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'Authenticated cannot update profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.payment_accounts', 'INSERT'),
  'Authenticated cannot insert payment accounts directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.payment_accounts', 'DELETE'),
  'Authenticated cannot delete payment accounts directly'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select set_staff_role('90000000-0000-4000-8000-000000000004', 'super_admin')$$,
  '42501', 'NOT_AUTHORIZED', 'Admin cannot change staff roles'
);
select throws_ok(
  $$update public.profiles set role = 'super_admin' where id = '90000000-0000-4000-8000-000000000004'$$,
  '42501', 'permission denied for table profiles', 'Authenticated cannot update profiles through PostgREST'
);
select throws_ok(
  $$insert into public.payment_accounts(method, provider, account_name, account_no)
    values ('transfer', 'BANK', 'Owner', '12345')$$,
  '42501', 'permission denied for table payment_accounts', 'Authenticated cannot insert payment accounts directly'
);
select throws_ok(
  $$delete from public.payment_accounts where id = '94000000-0000-4000-8000-000000000001'$$,
  '42501', 'permission denied for table payment_accounts', 'Authenticated cannot delete payment accounts directly'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is(
  (set_staff_role('90000000-0000-4000-8000-000000000004', 'super_admin')).role,
  'super_admin'::role_type,
  'Super admin can change a staff role'
);
select is(
  (set_staff_active('90000000-0000-4000-8000-000000000004', false)).is_active,
  false,
  'Super admin can deactivate staff'
);
select throws_ok(
  $$select set_staff_role('90000000-0000-4000-8000-000000000002', 'admin')$$,
  '42501', 'SELF_ROLE_CHANGE_FORBIDDEN', 'Super admin cannot demote themselves'
);
select throws_ok(
  $$select set_staff_active('90000000-0000-4000-8000-000000000002', false)$$,
  '42501', 'SELF_DEACTIVATION_FORBIDDEN', 'Super admin cannot deactivate themselves'
);
select is(
  (set_staff_role('90000000-0000-4000-8000-000000000003', 'admin')).role,
  'admin'::role_type,
  'A super admin can change a different super admin role while another remains'
);
select is(
  (select count(*) from public.profiles where role = 'super_admin' and is_active),
  1::bigint,
  'At least one active super admin remains after role changes'
);
select ok(
  (select count(*) = 3 from public.audit_logs
   where actor_id = '90000000-0000-4000-8000-000000000002'
     and entity = 'staff'
     and action in ('staff.role.update', 'staff.deactivate')),
  'Successful staff role and active changes are audited'
);

select finish();
rollback;
