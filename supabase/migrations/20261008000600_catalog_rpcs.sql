begin;

create function upsert_category(p_id uuid, p_name text, p_sort_order int default 0, p_is_active boolean default true)
returns categories
language plpgsql
security definer
set search_path = public
as $$
declare
  result categories%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if nullif(trim(p_name), '') is null then raise exception using errcode = 'P0001', message = 'CATEGORY_NAME_REQUIRED'; end if;
  if p_id is null then
    insert into categories(name, sort_order, is_active)
    values (trim(p_name), coalesce(p_sort_order, 0), coalesce(p_is_active, true)) returning * into result;
  else
    update categories set name = trim(p_name), sort_order = coalesce(p_sort_order, sort_order),
      is_active = coalesce(p_is_active, is_active) where id = p_id returning * into result;
    if not found then raise exception using errcode = 'P0001', message = 'CATEGORY_NOT_FOUND'; end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'category.save', 'category', result.id::text, jsonb_build_object('name', result.name));
  return result;
end;
$$;

create function upsert_menu_item(p_item jsonb)
returns menu_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item_id uuid;
  result menu_items%rowtype;
  recipe_item jsonb;
  new_recipe_id uuid;
  quantity_per_serving numeric(14,3);
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if jsonb_typeof(p_item) <> 'object'
    or nullif(trim(p_item ->> 'name'), '') is null
    or nullif(p_item ->> 'category_id', '') is null
    or coalesce((p_item ->> 'price')::bigint, -1) < 0 then
    raise exception using errcode = 'P0001', message = 'MENU_ITEM_INPUT_INVALID';
  end if;
  item_id := nullif(p_item ->> 'id', '')::uuid;
  if item_id is null then
    insert into menu_items(category_id, name, description, price, image_path, is_available, is_active, sort_order)
    values ((p_item ->> 'category_id')::uuid, trim(p_item ->> 'name'), nullif(p_item ->> 'description', ''),
      (p_item ->> 'price')::bigint, nullif(p_item ->> 'image_path', ''),
      coalesce((p_item ->> 'is_available')::boolean, true), coalesce((p_item ->> 'is_active')::boolean, true),
      coalesce((p_item ->> 'sort_order')::int, 0)) returning * into result;
    item_id := result.id;
  else
    update menu_items set category_id = (p_item ->> 'category_id')::uuid,
      name = trim(p_item ->> 'name'), description = nullif(p_item ->> 'description', ''),
      price = (p_item ->> 'price')::bigint,
      image_path = case when p_item ? 'image_path' then nullif(p_item ->> 'image_path', '') else image_path end,
      is_available = coalesce((p_item ->> 'is_available')::boolean, is_available),
      is_active = coalesce((p_item ->> 'is_active')::boolean, is_active),
      sort_order = coalesce((p_item ->> 'sort_order')::int, sort_order)
    where id = item_id returning * into result;
    if not found then raise exception using errcode = 'P0001', message = 'MENU_ITEM_NOT_FOUND'; end if;
  end if;

  if p_item ? 'recipe_lines' then
    if jsonb_typeof(p_item -> 'recipe_lines') <> 'array' then
      raise exception using errcode = 'P0001', message = 'RECIPE_INPUT_INVALID';
    end if;
    delete from recipe_lines where menu_item_id = item_id;
    for recipe_item in select value from jsonb_array_elements(p_item -> 'recipe_lines')
    loop
      new_recipe_id := (recipe_item ->> 'inventory_item_id')::uuid;
      quantity_per_serving := (recipe_item ->> 'qty_per_serving')::numeric;
      if quantity_per_serving <= 0 then raise exception using errcode = 'P0001', message = 'RECIPE_QUANTITY_INVALID'; end if;
      insert into recipe_lines(menu_item_id, inventory_item_id, qty_per_serving)
      values (item_id, new_recipe_id, quantity_per_serving);
    end loop;
  end if;

  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'menu_item.save', 'menu_item', item_id::text,
    jsonb_build_object('name', result.name, 'price', result.price));
  return result;
end;
$$;

create function set_menu_item_available(p_item_id uuid, p_is_available boolean)
returns menu_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result menu_items%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  update menu_items set is_available = p_is_available where id = p_item_id returning * into result;
  if not found then raise exception using errcode = 'P0001', message = 'MENU_ITEM_NOT_FOUND'; end if;
  return result;
end;
$$;

create function upsert_inventory_item(p_item jsonb)
returns inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item_id uuid;
  result inventory_items%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if jsonb_typeof(p_item) <> 'object' or nullif(trim(p_item ->> 'name'), '') is null
    or nullif(trim(p_item ->> 'unit'), '') is null then
    raise exception using errcode = 'P0001', message = 'INVENTORY_INPUT_INVALID';
  end if;
  item_id := nullif(p_item ->> 'id', '')::uuid;
  if item_id is null then
    insert into inventory_items(name, unit, min_qty, unit_cost, is_active)
    values (trim(p_item ->> 'name'), trim(p_item ->> 'unit'),
      coalesce((p_item ->> 'min_qty')::numeric, 0), coalesce((p_item ->> 'unit_cost')::bigint, 0),
      coalesce((p_item ->> 'is_active')::boolean, true)) returning * into result;
  else
    update inventory_items set name = trim(p_item ->> 'name'), unit = trim(p_item ->> 'unit'),
      min_qty = coalesce((p_item ->> 'min_qty')::numeric, min_qty),
      unit_cost = coalesce((p_item ->> 'unit_cost')::bigint, unit_cost),
      is_active = coalesce((p_item ->> 'is_active')::boolean, is_active)
    where id = item_id returning * into result;
    if not found then raise exception using errcode = 'P0001', message = 'INVENTORY_ITEM_NOT_FOUND'; end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'inventory_item.save', 'inventory_item', result.id::text,
    jsonb_build_object('name', result.name, 'unit', result.unit));
  return result;
end;
$$;

create function upsert_voucher(p_voucher jsonb)
returns vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  voucher_id uuid;
  result vouchers%rowtype;
  normalized_code text;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  normalized_code := upper(trim(p_voucher ->> 'code'));
  if nullif(normalized_code, '') is null or normalized_code !~ '^[A-Z0-9-]+$'
    or nullif(trim(p_voucher ->> 'name'), '') is null then
    raise exception using errcode = 'P0001', message = 'VOUCHER_INPUT_INVALID';
  end if;
  voucher_id := nullif(p_voucher ->> 'id', '')::uuid;
  if voucher_id is null then
    insert into vouchers(code, name, type, value, min_subtotal, max_discount, valid_from,
      valid_until, total_quota, per_order_limit, is_active, created_by)
    values (normalized_code, trim(p_voucher ->> 'name'), (p_voucher ->> 'type')::voucher_type,
      (p_voucher ->> 'value')::bigint, coalesce((p_voucher ->> 'min_subtotal')::bigint, 0),
      nullif(p_voucher ->> 'max_discount', '')::bigint, (p_voucher ->> 'valid_from')::timestamptz,
      (p_voucher ->> 'valid_until')::timestamptz, nullif(p_voucher ->> 'total_quota', '')::int,
      coalesce((p_voucher ->> 'per_order_limit')::int, 1), coalesce((p_voucher ->> 'is_active')::boolean, true), auth.uid())
    returning * into result;
  else
    update vouchers set code = normalized_code, name = trim(p_voucher ->> 'name'),
      type = (p_voucher ->> 'type')::voucher_type, value = (p_voucher ->> 'value')::bigint,
      min_subtotal = coalesce((p_voucher ->> 'min_subtotal')::bigint, min_subtotal),
      max_discount = case when p_voucher ? 'max_discount' then nullif(p_voucher ->> 'max_discount', '')::bigint else max_discount end,
      valid_from = (p_voucher ->> 'valid_from')::timestamptz,
      valid_until = (p_voucher ->> 'valid_until')::timestamptz,
      total_quota = case when p_voucher ? 'total_quota' then nullif(p_voucher ->> 'total_quota', '')::int else total_quota end,
      per_order_limit = coalesce((p_voucher ->> 'per_order_limit')::int, per_order_limit),
      is_active = coalesce((p_voucher ->> 'is_active')::boolean, is_active)
    where id = voucher_id returning * into result;
    if not found then raise exception using errcode = 'P0001', message = 'VOUCHER_NOT_FOUND'; end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'voucher.save', 'voucher', result.id::text, jsonb_build_object('code', result.code));
  return result;
end;
$$;

create function set_voucher_active(p_voucher_id uuid, p_is_active boolean)
returns vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  result vouchers%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  update vouchers set is_active = p_is_active where id = p_voucher_id returning * into result;
  if not found then raise exception using errcode = 'P0001', message = 'VOUCHER_NOT_FOUND'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), case when p_is_active then 'voucher.activate' else 'voucher.deactivate' end,
    'voucher', p_voucher_id::text);
  return result;
end;
$$;

create function upsert_payment_account(p_account jsonb)
returns payment_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid;
  result payment_accounts%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if nullif(trim(p_account ->> 'provider'), '') is null
    or nullif(trim(p_account ->> 'account_name'), '') is null
    or nullif(trim(p_account ->> 'account_no'), '') is null
    or (p_account ->> 'account_no') !~ '^[0-9]+$' then
    raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_INPUT_INVALID';
  end if;
  account_id := nullif(p_account ->> 'id', '')::uuid;
  if account_id is null then
    insert into payment_accounts(method, provider, account_name, account_no, is_active, sort_order)
    values ((p_account ->> 'method')::payment_method, trim(p_account ->> 'provider'),
      trim(p_account ->> 'account_name'), trim(p_account ->> 'account_no'),
      coalesce((p_account ->> 'is_active')::boolean, true), coalesce((p_account ->> 'sort_order')::int, 0))
    returning * into result;
  else
    update payment_accounts set method = (p_account ->> 'method')::payment_method,
      provider = trim(p_account ->> 'provider'), account_name = trim(p_account ->> 'account_name'),
      account_no = trim(p_account ->> 'account_no'),
      is_active = coalesce((p_account ->> 'is_active')::boolean, is_active),
      sort_order = coalesce((p_account ->> 'sort_order')::int, sort_order)
    where id = account_id returning * into result;
    if not found then raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_NOT_FOUND'; end if;
  end if;
  if result.method not in ('transfer', 'ewallet') then
    raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_METHOD_INVALID';
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'payment_account.save', 'payment_account', result.id::text,
    jsonb_build_object('provider', result.provider, 'method', result.method));
  return result;
end;
$$;

create function set_payment_account_active(p_account_id uuid, p_is_active boolean)
returns payment_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  result payment_accounts%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  update payment_accounts set is_active = p_is_active where id = p_account_id returning * into result;
  if not found then raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_NOT_FOUND'; end if;
  return result;
end;
$$;

do $$
declare
  signature text;
begin
  foreach signature in array array[
    'upsert_category(uuid,text,integer,boolean)', 'upsert_menu_item(jsonb)',
    'set_menu_item_available(uuid,boolean)', 'upsert_inventory_item(jsonb)',
    'upsert_voucher(jsonb)', 'set_voucher_active(uuid,boolean)',
    'upsert_payment_account(jsonb)', 'set_payment_account_active(uuid,boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', signature);
    execute format('grant execute on function %s to authenticated', signature);
  end loop;
end;
$$;

commit;