begin;

create function record_stock_movement(
  p_item_id uuid,
  p_type movement_type,
  p_qty numeric,
  p_note text default null,
  p_reference_id text default null
)
returns stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  inventory_record inventory_items%rowtype;
  result stock_movements%rowtype;
  delta numeric(14,3);
  allow_negative boolean;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_qty is null or p_qty = 0 or p_type not in ('purchase', 'waste', 'adjustment') then
    raise exception using errcode = 'P0001', message = 'STOCK_MOVEMENT_INVALID';
  end if;
  delta := case when p_type = 'purchase' then abs(p_qty)
    when p_type = 'waste' then -abs(p_qty) else p_qty end;
  select * into inventory_record from inventory_items where id = p_item_id and is_active for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVENTORY_ITEM_NOT_FOUND'; end if;
  select allow_negative_stock into allow_negative from store_settings where id = 1;
  if inventory_record.current_qty + delta < 0
    and not (coalesce(allow_negative, false) and is_super_admin()) then
    raise exception using errcode = 'P0001', message = 'STOCK_INSUFFICIENT';
  end if;

  update inventory_items set current_qty = current_qty + delta where id = p_item_id;
  insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, note, actor_id)
  values (p_item_id, p_type, delta, p_reference_id, nullif(trim(p_note), ''), auth.uid())
  returning * into result;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'inventory.movement', 'inventory_item', p_item_id::text,
    jsonb_build_object('type', p_type, 'qty_change', delta, 'reference_id', p_reference_id));
  return result;
end;
$$;

create function open_stock_opname()
returns stock_opnames
language plpgsql
security definer
set search_path = public
as $$
declare
  opname_record stock_opnames%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  perform id from inventory_items where is_active order by id for update;
  insert into stock_opnames(opened_by) values (auth.uid()) returning * into opname_record;
  insert into stock_opname_lines(opname_id, inventory_item_id, system_qty)
  select opname_record.id, id, current_qty from inventory_items where is_active;
  insert into audit_logs(actor_id, action, entity, entity_id)
  values (auth.uid(), 'stock_opname.open', 'stock_opname', opname_record.id::text);
  return opname_record;
end;
$$;

create function save_stock_opname_count(p_opname_id uuid, p_item_id uuid, p_counted_qty numeric)
returns stock_opname_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  opname_record stock_opnames%rowtype;
  result stock_opname_lines%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_counted_qty is null or p_counted_qty < 0 then
    raise exception using errcode = 'P0001', message = 'OPNAME_COUNT_INVALID';
  end if;
  select * into opname_record from stock_opnames where id = p_opname_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'OPNAME_NOT_FOUND'; end if;
  if opname_record.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'OPNAME_FINALIZED';
  end if;
  update stock_opname_lines set counted_qty = p_counted_qty
  where opname_id = p_opname_id and inventory_item_id = p_item_id returning * into result;
  if not found then raise exception using errcode = 'P0001', message = 'OPNAME_ITEM_NOT_FOUND'; end if;
  return result;
end;
$$;

create function finalize_stock_opname(p_opname_id uuid)
returns stock_opnames
language plpgsql
security definer
set search_path = public
as $$
declare
  opname_record stock_opnames%rowtype;
  line_record record;
  difference_value numeric(14,3);
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  select * into opname_record from stock_opnames where id = p_opname_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'OPNAME_NOT_FOUND'; end if;
  if opname_record.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'OPNAME_FINALIZED';
  end if;
  if exists (select 1 from stock_opname_lines where opname_id = p_opname_id and counted_qty is null) then
    raise exception using errcode = 'P0001', message = 'OPNAME_COUNTS_INCOMPLETE';
  end if;

  for line_record in
    select line.inventory_item_id, line.system_qty, line.counted_qty, inventory.current_qty
    from stock_opname_lines line
    join inventory_items inventory on inventory.id = line.inventory_item_id
    where line.opname_id = p_opname_id
    order by line.inventory_item_id
    for update of inventory
  loop
    difference_value := line_record.counted_qty - line_record.system_qty;
    if difference_value <> 0 then
      update inventory_items set current_qty = current_qty + difference_value
      where id = line_record.inventory_item_id;
      insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, note, actor_id)
      values (line_record.inventory_item_id, 'opname', difference_value, p_opname_id::text,
        'Penyesuaian hasil stok opname', auth.uid());
    end if;
  end loop;

  update stock_opnames set status = 'finalized', finalized_at = now()
  where id = p_opname_id returning * into opname_record;
  insert into audit_logs(actor_id, action, entity, entity_id)
  values (auth.uid(), 'stock_opname.finalize', 'stock_opname', p_opname_id::text);
  return opname_record;
end;
$$;

create function update_store_settings(p_settings jsonb)
returns store_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result store_settings%rowtype;
begin
  if not is_super_admin() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode = 'P0001', message = 'SETTINGS_INPUT_INVALID';
  end if;
  update store_settings set
    store_name = coalesce(p_settings ->> 'store_name', store_name),
    address = case when p_settings ? 'address' then nullif(p_settings ->> 'address', '') else address end,
    phone = case when p_settings ? 'phone' then nullif(p_settings ->> 'phone', '') else phone end,
    logo_path = case when p_settings ? 'logo_path' then nullif(p_settings ->> 'logo_path', '') else logo_path end,
    primary_color = coalesce(p_settings ->> 'primary_color', primary_color),
    accent_color = coalesce(p_settings ->> 'accent_color', accent_color),
    font_family = coalesce(p_settings ->> 'font_family', font_family),
    tax_percent = coalesce((p_settings ->> 'tax_percent')::numeric, tax_percent),
    service_percent = coalesce((p_settings ->> 'service_percent')::numeric, service_percent),
    rounding_rule = coalesce(p_settings ->> 'rounding_rule', rounding_rule),
    receipt_header = case when p_settings ? 'receipt_header' then nullif(p_settings ->> 'receipt_header', '') else receipt_header end,
    receipt_footer = case when p_settings ? 'receipt_footer' then nullif(p_settings ->> 'receipt_footer', '') else receipt_footer end,
    paper_width_mm = coalesce((p_settings ->> 'paper_width_mm')::int, paper_width_mm),
    require_verified_payment_before_complete = coalesce(
      (p_settings ->> 'require_verified_payment_before_complete')::boolean,
      require_verified_payment_before_complete
    ),
    allow_negative_stock = coalesce((p_settings ->> 'allow_negative_stock')::boolean, allow_negative_stock),
    open_hours = coalesce(p_settings -> 'open_hours', open_hours),
    updated_by = auth.uid(), updated_at = now()
  where id = 1 returning * into result;
  if not found then raise exception using errcode = 'P0001', message = 'SETTINGS_NOT_CONFIGURED'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'settings.update', 'store_settings', '1', p_settings - 'logo_path');
  return result;
end;
$$;

revoke all on function record_stock_movement(uuid,movement_type,numeric,text,text) from public, anon;
revoke all on function open_stock_opname() from public, anon;
revoke all on function save_stock_opname_count(uuid,uuid,numeric) from public, anon;
revoke all on function finalize_stock_opname(uuid) from public, anon;
revoke all on function update_store_settings(jsonb) from public, anon;
grant execute on function record_stock_movement(uuid,movement_type,numeric,text,text) to authenticated;
grant execute on function open_stock_opname() to authenticated;
grant execute on function save_stock_opname_count(uuid,uuid,numeric) to authenticated;
grant execute on function finalize_stock_opname(uuid) to authenticated;
grant execute on function update_store_settings(jsonb) to authenticated;

commit;