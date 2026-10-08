begin;

create function open_shift(p_opening_cash bigint)
returns shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  result shifts%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_opening_cash is null or p_opening_cash < 0 then
    raise exception using errcode = 'P0001', message = 'OPENING_CASH_INVALID';
  end if;
  insert into shifts(opened_by, opening_cash) values (auth.uid(), p_opening_cash)
  returning * into result;
  insert into audit_logs(actor_id, action, entity, entity_id)
  values (auth.uid(), 'shift.open', 'shift', result.id::text);
  return result;
end;
$$;

create function close_shift(p_actual_cash bigint, p_note text default null)
returns shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_record shifts%rowtype;
  expected_value bigint;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_actual_cash is null or p_actual_cash < 0 then
    raise exception using errcode = 'P0001', message = 'ACTUAL_CASH_INVALID';
  end if;

  select * into shift_record from shifts where status = 'open' for update;
  if not found then raise exception using errcode = 'P0001', message = 'SHIFT_NOT_OPEN'; end if;
  if exists (select 1 from orders where shift_id = shift_record.id and bill_state = 'open') then
    raise exception using errcode = 'P0001', message = 'OPEN_BILL_REMAINS';
  end if;

  select shift_record.opening_cash
    + coalesce((
      select sum(payments.amount) from payments
      join orders on orders.id = payments.order_id
      where orders.shift_id = shift_record.id and payments.method = 'cash' and payments.status = 'verified'
    ), 0)
    - coalesce((
      select sum(refunds.amount) from refunds
      join payments on payments.id = refunds.payment_id
      join orders on orders.id = payments.order_id
      where orders.shift_id = shift_record.id and payments.method = 'cash'
    ), 0)
  into expected_value;

  update shifts set
    status = 'closed', closed_by = auth.uid(), closed_at = now(),
    expected_cash = expected_value, actual_cash = p_actual_cash,
    difference = p_actual_cash - expected_value, note = nullif(p_note, '')
  where id = shift_record.id
  returning * into shift_record;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'shift.close', 'shift', shift_record.id::text,
    jsonb_build_object('expected_cash', expected_value, 'actual_cash', p_actual_cash));
  return shift_record;
end;
$$;

create function create_order(
  p_order_type order_type,
  p_items jsonb,
  p_voucher_code text default null,
  p_table_label text default null,
  p_bill_mode text default 'none'
)
returns orders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  shift_record shifts%rowtype;
  order_record orders%rowtype;
  voucher_record vouchers%rowtype;
  local_day date;
  daily_no int;
  subtotal_value bigint;
  voucher_discount bigint;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_order_type is null or p_bill_mode not in ('none', 'open') then
    raise exception using errcode = 'P0001', message = 'ORDER_INPUT_INVALID';
  end if;
  if p_bill_mode = 'open' and nullif(p_voucher_code, '') is not null then
    raise exception using errcode = 'P0001', message = 'VOUCHER_APPLY_ON_CLOSE';
  end if;

  select * into shift_record from shifts where status = 'open' for share;
  if not found then raise exception using errcode = 'P0001', message = 'SHIFT_NOT_OPEN'; end if;

  local_day := (now() at time zone 'Asia/Jakarta')::date;
  insert into daily_sequences(day, last_no) values (local_day, 1)
  on conflict (day) do update set last_no = daily_sequences.last_no + 1
  returning last_no into daily_no;

  insert into orders(order_no, shift_id, order_type, bill_state, table_label, created_by)
  values (
    'JKG-' || to_char(local_day, 'YYYYMMDD') || '-' || lpad(daily_no::text, 4, '0'),
    shift_record.id,
    p_order_type,
    case when p_bill_mode = 'open' then 'open'::bill_state else null end,
    nullif(p_table_label, ''),
    auth.uid()
  ) returning * into order_record;

  subtotal_value := _append_order_items(order_record.id, p_items);

  if nullif(p_voucher_code, '') is not null then
    select * into voucher_record from vouchers where code = upper(trim(p_voucher_code)) for update;
    if not found then raise exception using errcode = 'P0001', message = 'VOUCHER_NOT_FOUND'; end if;
    voucher_discount := _voucher_discount(voucher_record.id, subtotal_value);
    update vouchers set used_count = used_count + 1 where id = voucher_record.id;
    insert into voucher_redemptions(voucher_id, order_id, discount)
    values (voucher_record.id, order_record.id, voucher_discount);
  end if;

  perform _recalculate_order(order_record.id, voucher_record.id);
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'order.create', 'order', order_record.id::text,
    jsonb_build_object('order_no', order_record.order_no, 'bill_mode', p_bill_mode));
  select * into order_record from orders where id = order_record.id;
  return order_record;
end;
$$;

create function add_items_to_open_bill(p_order_id uuid, p_items jsonb)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if order_record.bill_state <> 'open' then
    raise exception using errcode = 'P0001', message = 'BILL_CLOSED';
  end if;
  perform _append_order_items(p_order_id, p_items);
  perform _recalculate_order(p_order_id, order_record.voucher_id);
  insert into audit_logs(actor_id, action, entity, entity_id)
  values (auth.uid(), 'open_bill.add_items', 'order', p_order_id::text);
  select * into order_record from orders where id = p_order_id;
  return order_record;
end;
$$;

create function apply_voucher(p_order_id uuid, p_code text)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
  voucher_record vouchers%rowtype;
  discount_value bigint;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if order_record.bill_state = 'closed' or order_record.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'BILL_CLOSED';
  end if;
  if order_record.voucher_id is not null then
    update vouchers set used_count = greatest(used_count - 1, 0) where id = order_record.voucher_id;
    delete from voucher_redemptions where order_id = p_order_id;
  end if;

  select * into voucher_record from vouchers where code = upper(trim(p_code)) for update;
  if not found then raise exception using errcode = 'P0001', message = 'VOUCHER_NOT_FOUND'; end if;
  discount_value := _voucher_discount(voucher_record.id, order_record.subtotal);
  update vouchers set used_count = used_count + 1 where id = voucher_record.id;
  insert into voucher_redemptions(voucher_id, order_id, discount)
  values (voucher_record.id, p_order_id, discount_value);
  perform _recalculate_order(p_order_id, voucher_record.id);
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'voucher.apply', 'order', p_order_id::text,
    jsonb_build_object('code', voucher_record.code, 'discount', discount_value));
  select * into order_record from orders where id = p_order_id;
  return order_record;
end;
$$;

create function void_order_item(p_item_id uuid, p_reason text)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record order_items%rowtype;
  order_record orders%rowtype;
  recipe_record record;
  subtotal_value bigint;
  voucher_minimum bigint;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if nullif(trim(p_reason), '') is null then
    raise exception using errcode = 'P0001', message = 'REASON_REQUIRED';
  end if;
  select * into item_record from order_items where id = p_item_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_ITEM_NOT_FOUND'; end if;
  select * into order_record from orders where id = item_record.order_id for update;
  if order_record.status = 'completed' or order_record.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'ORDER_TERMINAL';
  end if;
  if item_record.is_voided then raise exception using errcode = 'P0001', message = 'ITEM_ALREADY_VOIDED'; end if;

  for recipe_record in
    select inventory.id, recipe.qty_per_serving * item_record.qty as return_qty
    from recipe_lines recipe
    join inventory_items inventory on inventory.id = recipe.inventory_item_id
    where recipe.menu_item_id = item_record.menu_item_id
    order by inventory.id
    for update of inventory
  loop
    update inventory_items set current_qty = current_qty + recipe_record.return_qty
    where id = recipe_record.id;
    insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, note, actor_id)
    values (recipe_record.id, 'void_return', recipe_record.return_qty, order_record.id::text, p_reason, auth.uid());
  end loop;

  update order_items set is_voided = true, void_reason = trim(p_reason),
    voided_by = auth.uid(), voided_at = now() where id = p_item_id;
  select coalesce(sum(line_total), 0)::bigint into subtotal_value
  from order_items where order_id = order_record.id and not is_voided;

  if order_record.voucher_id is not null then
    select min_subtotal into voucher_minimum from vouchers where id = order_record.voucher_id;
    if subtotal_value < voucher_minimum then
      update vouchers set used_count = greatest(used_count - 1, 0) where id = order_record.voucher_id;
      delete from voucher_redemptions where order_id = order_record.id;
      order_record.voucher_id := null;
    end if;
  end if;
  perform _recalculate_order(order_record.id, order_record.voucher_id);
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'order.void_item', 'order_item', p_item_id::text,
    jsonb_build_object('reason', trim(p_reason), 'order_id', order_record.id));
  select * into order_record from orders where id = order_record.id;
  return order_record;
end;
$$;

create function cancel_order(p_order_id uuid, p_reason text)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
  item_record order_items%rowtype;
  recipe_record record;
  payment_record payments%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if nullif(trim(p_reason), '') is null then
    raise exception using errcode = 'P0001', message = 'REASON_REQUIRED';
  end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if order_record.status not in ('new', 'processing') then
    raise exception using errcode = 'P0001', message = 'ORDER_CANNOT_CANCEL';
  end if;

  for item_record in select * from order_items where order_id = p_order_id and not is_voided for update
  loop
    for recipe_record in
      select inventory.id, recipe.qty_per_serving * item_record.qty as return_qty
      from recipe_lines recipe
      join inventory_items inventory on inventory.id = recipe.inventory_item_id
      where recipe.menu_item_id = item_record.menu_item_id
      order by inventory.id
      for update of inventory
    loop
      update inventory_items set current_qty = current_qty + recipe_record.return_qty
      where id = recipe_record.id;
      insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, note, actor_id)
      values (recipe_record.id, 'void_return', recipe_record.return_qty, p_order_id::text, p_reason, auth.uid());
    end loop;
  end loop;

  for payment_record in select * from payments where order_id = p_order_id for update
  loop
    if payment_record.status = 'verified' then
      insert into refunds(payment_id, amount, reason, actor_id)
      values (payment_record.id, payment_record.amount, trim(p_reason), auth.uid());
    elsif payment_record.status = 'pending_verification' then
      update payments set status = 'rejected', note = trim(p_reason),
        verified_by = auth.uid(), verified_at = now() where id = payment_record.id;
    end if;
  end loop;

  if order_record.voucher_id is not null then
    update vouchers set used_count = greatest(used_count - 1, 0) where id = order_record.voucher_id;
    delete from voucher_redemptions where order_id = p_order_id;
  end if;
  update orders set status = 'cancelled', bill_state = case when bill_state = 'open' then 'closed'::bill_state else bill_state end,
    cancel_reason = trim(p_reason), closed_at = now()
  where id = p_order_id returning * into order_record;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'order.cancel', 'order', p_order_id::text, jsonb_build_object('reason', trim(p_reason)));
  return order_record;
end;
$$;

create function change_order_status(p_order_id uuid, p_to_status order_status)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
  allowed_transition boolean := false;
  must_verify boolean;
  paid_total bigint;
  has_unverified boolean;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;

  allowed_transition := (order_record.status = 'new' and p_to_status = 'processing')
    or (order_record.status = 'processing' and p_to_status = 'ready')
    or (order_record.status = 'ready' and p_to_status in ('completed', 'processing'));
  if not allowed_transition then
    raise exception using errcode = 'P0001', message = 'ORDER_STATUS_TRANSITION_INVALID';
  end if;

  if p_to_status = 'completed' then
    if order_record.bill_state = 'open' then
      raise exception using errcode = 'P0001', message = 'BILL_NOT_CLOSED';
    end if;
    select coalesce(require_verified_payment_before_complete, true) into must_verify
    from store_settings where id = 1;
    select coalesce(sum(amount) filter (where status = 'verified'), 0),
      coalesce(bool_or(status = 'pending_verification'), false)
    into paid_total, has_unverified from payments where order_id = p_order_id;
    if coalesce(must_verify, true) and (has_unverified or paid_total < order_record.grand_total) then
      raise exception using errcode = 'P0001', message = 'PAYMENT_NOT_VERIFIED';
    end if;
  end if;

  update orders set status = p_to_status, closed_at = case when p_to_status = 'completed' then now() else closed_at end
  where id = p_order_id returning * into order_record;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'order.status_change', 'order', p_order_id::text,
    jsonb_build_object('to_status', p_to_status));
  return order_record;
end;
$$;

create function submit_payment(
  p_order_id uuid,
  p_method payment_method,
  p_amount bigint,
  p_payment_account_id uuid default null,
  p_reference_no text default null,
  p_proof_path text default null,
  p_received_amount bigint default null
)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
  result payments%rowtype;
  account_method payment_method;
  outstanding bigint;
  payment_state payment_status;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if p_amount is null or p_amount < 1 or p_method is null then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INPUT_INVALID';
  end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if order_record.status = 'cancelled' or order_record.bill_state = 'open' then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_PAYABLE';
  end if;

  select order_record.grand_total - coalesce(sum(amount) filter (where status <> 'rejected'), 0)
  into outstanding from payments where order_id = p_order_id;
  if p_amount > outstanding then
    raise exception using errcode = 'P0001', message = 'PAYMENT_EXCEEDS_BALANCE';
  end if;

  if p_method = 'cash' then
    if p_payment_account_id is not null or coalesce(p_received_amount, p_amount) < p_amount then
      raise exception using errcode = 'P0001', message = 'CASH_AMOUNT_INVALID';
    end if;
    payment_state := 'verified';
  else
    if p_payment_account_id is null then
      raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_REQUIRED';
    end if;
    select method into account_method from payment_accounts
    where id = p_payment_account_id and is_active;
    if not found or account_method <> p_method then
      raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_INVALID';
    end if;
    payment_state := 'pending_verification';
  end if;

  insert into payments(order_id, method, payment_account_id, amount, received_amount, status,
    proof_path, reference_no, verified_by, verified_at)
  values (p_order_id, p_method, p_payment_account_id, p_amount,
    case when p_method = 'cash' then coalesce(p_received_amount, p_amount) end,
    payment_state, p_proof_path, nullif(p_reference_no, ''),
    case when p_method = 'cash' then auth.uid() end,
    case when p_method = 'cash' then now() end)
  returning * into result;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'payment.submit', 'payment', result.id::text,
    jsonb_build_object('method', p_method, 'amount', p_amount, 'status', payment_state));
  return result;
end;
$$;

create function verify_payment(p_payment_id uuid, p_approve boolean, p_note text default null)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record payments%rowtype;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  select * into payment_record from payments where id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'PAYMENT_NOT_FOUND'; end if;
  if payment_record.status <> 'pending_verification' then
    raise exception using errcode = 'P0001', message = 'PAYMENT_ALREADY_REVIEWED';
  end if;
  update payments set status = case when p_approve then 'verified'::payment_status else 'rejected'::payment_status end,
    note = nullif(p_note, ''), verified_by = auth.uid(), verified_at = now()
  where id = p_payment_id returning * into payment_record;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), case when p_approve then 'payment.verify' else 'payment.reject' end,
    'payment', p_payment_id::text, jsonb_build_object('note', p_note));
  return payment_record;
end;
$$;

create function close_open_bill(p_order_id uuid, p_payments jsonb)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record orders%rowtype;
  payment_item jsonb;
  payment_method_value payment_method;
  payment_amount bigint;
  account_id uuid;
  reference_value text;
  proof_value text;
  received_value bigint;
  total_payments bigint := 0;
  remaining bigint;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INPUT_INVALID';
  end if;
  select * into order_record from orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if order_record.bill_state <> 'open' then
    raise exception using errcode = 'P0001', message = 'BILL_CLOSED';
  end if;
  perform _recalculate_order(p_order_id, order_record.voucher_id);
  select * into order_record from orders where id = p_order_id;

  for payment_item in select value from jsonb_array_elements(p_payments)
  loop
    payment_method_value := (payment_item ->> 'method')::payment_method;
    payment_amount := (payment_item ->> 'amount')::bigint;
    account_id := nullif(payment_item ->> 'payment_account_id', '')::uuid;
    reference_value := payment_item ->> 'reference_no';
    proof_value := payment_item ->> 'proof_path';
    received_value := nullif(payment_item ->> 'received_amount', '')::bigint;
    if payment_amount < 1 then raise exception using errcode = 'P0001', message = 'PAYMENT_INPUT_INVALID'; end if;
    total_payments := total_payments + payment_amount;
    if payment_method_value = 'cash' then
      if account_id is not null or coalesce(received_value, payment_amount) < payment_amount then
        raise exception using errcode = 'P0001', message = 'CASH_AMOUNT_INVALID';
      end if;
      insert into payments(order_id, method, amount, received_amount, status, verified_by, verified_at)
      values (p_order_id, 'cash', payment_amount, coalesce(received_value, payment_amount), 'verified', auth.uid(), now());
    else
      if account_id is null or not exists (
        select 1 from payment_accounts where id = account_id and is_active and method = payment_method_value
      ) then
        raise exception using errcode = 'P0001', message = 'PAYMENT_ACCOUNT_INVALID';
      end if;
      insert into payments(order_id, method, payment_account_id, amount, status, proof_path, reference_no)
      values (p_order_id, payment_method_value, account_id, payment_amount,
        'pending_verification', proof_value, reference_value);
    end if;
  end loop;

  if total_payments <> order_record.grand_total then
    raise exception using errcode = 'P0001', message = 'PAYMENT_TOTAL_MISMATCH';
  end if;
  update orders set bill_state = 'closed', closed_at = now() where id = p_order_id returning * into order_record;
  insert into audit_logs(actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'open_bill.close', 'order', p_order_id::text,
    jsonb_build_object('payments_total', total_payments, 'payment_count', jsonb_array_length(p_payments)));
  return order_record;
end;
$$;

do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'open_shift(bigint)', 'close_shift(bigint,text)',
    'create_order(order_type,jsonb,text,text,text)', 'add_items_to_open_bill(uuid,jsonb)',
    'apply_voucher(uuid,text)', 'void_order_item(uuid,text)', 'cancel_order(uuid,text)',
    'change_order_status(uuid,order_status)',
    'submit_payment(uuid,payment_method,bigint,uuid,text,text,bigint)',
    'verify_payment(uuid,boolean,text)', 'close_open_bill(uuid,jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', function_signature);
    execute format('grant execute on function %s to authenticated', function_signature);
  end loop;
end;
$$;

commit;