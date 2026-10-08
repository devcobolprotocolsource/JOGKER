begin;

create function _append_order_items(p_order_id uuid, p_items jsonb)
returns bigint
language plpgsql
set search_path = public, extensions
as $$
declare
  item jsonb;
  menu_record menu_items%rowtype;
  recipe_record record;
  group_record record;
  selected_options uuid[];
  modifier_snapshot jsonb;
  modifier_total bigint;
  line_total bigint;
  item_qty int;
  subtotal_total bigint := 0;
  option_count int;
  allow_negative boolean;
  used_qty numeric(14,3);
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'P0001', message = 'ITEMS_REQUIRED';
  end if;

  select allow_negative_stock into allow_negative from store_settings where id = 1;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception using errcode = 'P0001', message = 'ITEM_INVALID';
    end if;

    item_qty := (item ->> 'qty')::int;
    if item_qty < 1 or item_qty > 100 then
      raise exception using errcode = 'P0001', message = 'ITEM_QUANTITY_INVALID';
    end if;

    select * into menu_record
    from menu_items
    where id = (item ->> 'menu_item_id')::uuid
      and is_active and is_available
    for share;

    if not found then
      raise exception using errcode = 'P0001', message = 'MENU_ITEM_UNAVAILABLE';
    end if;

    if jsonb_typeof(coalesce(item -> 'modifier_option_ids', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = 'P0001', message = 'MODIFIER_INVALID';
    end if;

    select coalesce(array_agg(value::uuid order by value::uuid), '{}'::uuid[])
    into selected_options
    from jsonb_array_elements_text(coalesce(item -> 'modifier_option_ids', '[]'::jsonb));

    select count(*)::int, coalesce(sum(option.extra_price), 0)::bigint,
      coalesce(jsonb_agg(jsonb_build_object('name', option.name, 'extra_price', option.extra_price)
        order by option.name), '[]'::jsonb)
    into option_count, modifier_total, modifier_snapshot
    from modifier_options option
    join menu_item_modifier_groups link on link.group_id = option.group_id
    where link.menu_item_id = menu_record.id
      and option.id = any(selected_options)
      and option.is_active;

    if option_count <> cardinality(selected_options) then
      raise exception using errcode = 'P0001', message = 'MODIFIER_INVALID';
    end if;

    for group_record in
      select groups.id, groups.min_select, groups.max_select,
        count(option.id)::int as selected_count
      from menu_item_modifier_groups link
      join modifier_groups groups on groups.id = link.group_id
      left join modifier_options option on option.group_id = groups.id
        and option.id = any(selected_options) and option.is_active
      where link.menu_item_id = menu_record.id
      group by groups.id, groups.min_select, groups.max_select
    loop
      if group_record.selected_count < group_record.min_select
        or group_record.selected_count > group_record.max_select then
        raise exception using errcode = 'P0001', message = 'MODIFIER_SELECTION_INVALID';
      end if;
    end loop;

    line_total := (menu_record.price + modifier_total) * item_qty;
    insert into order_items(order_id, menu_item_id, item_name, unit_price, modifiers, qty, line_total, note)
    values (
      p_order_id,
      menu_record.id,
      menu_record.name,
      menu_record.price,
      modifier_snapshot,
      item_qty,
      line_total,
      nullif(item ->> 'note', '')
    );
    subtotal_total := subtotal_total + line_total;

    for recipe_record in
      select inventory.id, inventory.current_qty, recipe.qty_per_serving
      from recipe_lines recipe
      join inventory_items inventory on inventory.id = recipe.inventory_item_id
      where recipe.menu_item_id = menu_record.id
      order by inventory.id
      for update of inventory
    loop
      used_qty := recipe_record.qty_per_serving * item_qty;
      if recipe_record.current_qty < used_qty
        and not (coalesce(allow_negative, false) and is_super_admin()) then
        raise exception using errcode = 'P0001', message = 'STOCK_INSUFFICIENT';
      end if;

      update inventory_items set current_qty = current_qty - used_qty
      where id = recipe_record.id;
      insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, actor_id)
      values (recipe_record.id, 'sale', -used_qty, p_order_id::text, auth.uid());
    end loop;
  end loop;

  return subtotal_total;
end;
$$;

create function _voucher_discount(p_voucher_id uuid, p_subtotal bigint)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  voucher_record vouchers%rowtype;
  discount_value bigint;
begin
  select * into voucher_record from vouchers where id = p_voucher_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'VOUCHER_NOT_FOUND';
  end if;
  if not voucher_record.is_active then
    raise exception using errcode = 'P0001', message = 'VOUCHER_INACTIVE';
  end if;
  if now() < voucher_record.valid_from or now() > voucher_record.valid_until then
    raise exception using errcode = 'P0001', message = 'VOUCHER_EXPIRED';
  end if;
  if voucher_record.total_quota is not null and voucher_record.used_count >= voucher_record.total_quota then
    raise exception using errcode = 'P0001', message = 'VOUCHER_QUOTA_EXCEEDED';
  end if;
  if p_subtotal < voucher_record.min_subtotal then
    raise exception using errcode = 'P0001', message = 'VOUCHER_MINIMUM_NOT_MET';
  end if;

  if voucher_record.type = 'percent' then
    discount_value := round(p_subtotal::numeric * voucher_record.value / 100)::bigint;
    if voucher_record.max_discount is not null then
      discount_value := least(discount_value, voucher_record.max_discount);
    end if;
  else
    discount_value := least(voucher_record.value, p_subtotal);
  end if;
  return discount_value;
end;
$$;

create function _recalculate_order(p_order_id uuid, p_voucher_id uuid default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  subtotal_value bigint;
  discount_value bigint := 0;
  base_value bigint;
  service_value bigint;
  tax_value bigint;
  pre_round bigint;
  rounding_value bigint := 0;
  grand_value bigint;
  service_percent numeric(5,2);
  tax_percent numeric(5,2);
  rounding_mode text;
begin
  select coalesce(sum(line_total), 0)::bigint into subtotal_value
  from order_items where order_id = p_order_id and not is_voided;

  if p_voucher_id is not null then
    select case
      when type = 'percent' then least(
        round(subtotal_value::numeric * value / 100)::bigint,
        coalesce(max_discount, subtotal_value)
      )
      else least(value, subtotal_value)
    end
    into discount_value from vouchers where id = p_voucher_id;
    discount_value := coalesce(discount_value, 0);
  end if;

  select store.service_percent, store.tax_percent, store.rounding_rule
  into service_percent, tax_percent, rounding_mode
  from store_settings store where id = 1;

  base_value := greatest(subtotal_value - discount_value, 0);
  service_value := round(base_value::numeric * coalesce(service_percent, 0) / 100)::bigint;
  tax_value := round((base_value + service_value)::numeric * coalesce(tax_percent, 0) / 100)::bigint;
  pre_round := base_value + service_value + tax_value;

  if rounding_mode = 'up_100' then
    rounding_value := mod(100 - mod(pre_round, 100), 100);
  elsif rounding_mode = 'nearest_100' then
    rounding_value := round(pre_round::numeric / 100)::bigint * 100 - pre_round;
  end if;
  grand_value := pre_round + rounding_value;

  update orders set
    subtotal = subtotal_value,
    discount_total = discount_value,
    service_amount = service_value,
    tax_amount = tax_value,
    rounding_amount = rounding_value,
    grand_total = grand_value,
    voucher_id = p_voucher_id,
    voucher_code = (select code from vouchers where id = p_voucher_id)
  where id = p_order_id;

  if p_voucher_id is not null then
    update voucher_redemptions set discount = discount_value where order_id = p_order_id;
  end if;
end;
$$;

revoke all on function _append_order_items(uuid, jsonb) from public, anon, authenticated;
revoke all on function _voucher_discount(uuid, bigint) from public, anon, authenticated;
revoke all on function _recalculate_order(uuid, uuid) from public, anon, authenticated;

commit;