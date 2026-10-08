create or replace function current_role_type()
returns role_type
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_role_type() is not null
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_role_type() = 'super_admin'
$$;

revoke all on function current_role_type() from public;
revoke all on function is_staff() from public;
revoke all on function is_super_admin() from public;
grant execute on function current_role_type() to authenticated;
grant execute on function is_staff() to authenticated;
grant execute on function is_super_admin() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'store_settings', 'payment_accounts', 'audit_logs', 'categories',
    'menu_items', 'modifier_groups', 'modifier_options', 'menu_item_modifier_groups',
    'inventory_items', 'recipe_lines', 'stock_movements', 'stock_opnames',
    'stock_opname_lines', 'shifts', 'vouchers', 'daily_sequences', 'orders',
    'order_items', 'payments', 'refunds', 'voucher_redemptions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

grant select on profiles, store_settings, payment_accounts, categories, menu_items,
  modifier_groups, modifier_options, menu_item_modifier_groups, inventory_items,
  recipe_lines, stock_movements, stock_opnames, stock_opname_lines, shifts, vouchers,
  orders, order_items, payments, refunds, voucher_redemptions, audit_logs to authenticated;
grant select on store_settings to anon;

create policy profiles_select on profiles for select to authenticated using (is_staff());
create policy store_settings_select on store_settings for select using (true);
create policy payment_accounts_select on payment_accounts for select to authenticated using (is_staff());
create policy audit_logs_select on audit_logs for select to authenticated using (is_super_admin());
create policy categories_select on categories for select to authenticated using (is_staff());
create policy menu_items_select on menu_items for select to authenticated using (is_staff());
create policy modifier_groups_select on modifier_groups for select to authenticated using (is_staff());
create policy modifier_options_select on modifier_options for select to authenticated using (is_staff());
create policy menu_item_modifier_groups_select on menu_item_modifier_groups for select to authenticated using (is_staff());
create policy inventory_items_select on inventory_items for select to authenticated using (is_staff());
create policy recipe_lines_select on recipe_lines for select to authenticated using (is_staff());
create policy stock_movements_select on stock_movements for select to authenticated using (is_staff());
create policy stock_opnames_select on stock_opnames for select to authenticated using (is_staff());
create policy stock_opname_lines_select on stock_opname_lines for select to authenticated using (is_staff());
create policy shifts_select on shifts for select to authenticated using (is_staff());
create policy vouchers_select on vouchers for select to authenticated using (is_staff());
create policy orders_select on orders for select to authenticated using (is_staff());
create policy order_items_select on order_items for select to authenticated using (is_staff());
create policy payments_select on payments for select to authenticated using (is_staff());
create policy refunds_select on refunds for select to authenticated using (is_staff());
create policy voucher_redemptions_select on voucher_redemptions for select to authenticated using (is_staff());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('public-assets', 'public-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy payment_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and is_staff());
create policy payment_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and is_staff());
create policy public_assets_read on storage.objects for select
  using (bucket_id = 'public-assets');
create policy public_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and is_staff());
create policy public_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and is_staff())
  with check (bucket_id = 'public-assets' and is_staff());
create policy public_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and is_staff());