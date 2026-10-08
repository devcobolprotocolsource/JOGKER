begin;

create function get_sales_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  -- Only completed orders with at least one non-rejected payment are reportable.
  select jsonb_build_object(
    'totalSales', coalesce(sum(payment_totals.amount), 0)::bigint,
    'totalTransactions', count(distinct o.id)::bigint,
    'avgTransaction', coalesce(round(sum(payment_totals.amount)::numeric / nullif(count(distinct o.id), 0)), 0),
    'totalDiscount', coalesce(sum(o.discount_total), 0)::bigint,
    'totalService', coalesce(sum(o.service_amount), 0)::bigint,
    'totalTax', coalesce(sum(o.tax_amount), 0)::bigint,
    'totalVoid', coalesce(sum(void_totals.amount), 0)::bigint
  )
  into result
  from orders o
  join lateral (
    select sum(p.amount) as amount
    from payments p
    where p.order_id = o.id and p.status <> 'rejected'
  ) payment_totals on payment_totals.amount is not null
  left join lateral (
    select sum(oi.line_total) as amount
    from order_items oi
    where oi.order_id = o.id and oi.is_voided
  ) void_totals on true
  where o.status = 'completed'
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta');

  return result;
end;
$$;

create function get_daily_sales(p_from timestamptz, p_to timestamptz)
returns table(date date, "totalSales" bigint, "totalTransactions" bigint, "avgTransaction" numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select (o.created_at at time zone 'Asia/Jakarta')::date,
    coalesce(sum(payment_totals.amount), 0)::bigint,
    count(distinct o.id)::bigint,
    coalesce(round(sum(payment_totals.amount)::numeric / nullif(count(distinct o.id), 0)), 0)
  from orders o
  join lateral (
    select sum(p.amount) as amount
    from payments p
    where p.order_id = o.id and p.status <> 'rejected'
  ) payment_totals on payment_totals.amount is not null
  where o.status = 'completed'
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by (o.created_at at time zone 'Asia/Jakarta')::date
  order by (o.created_at at time zone 'Asia/Jakarta')::date;
end;
$$;

create function get_hourly_sales(p_from timestamptz, p_to timestamptz)
returns table(hour integer, "totalSales" bigint, "totalTransactions" bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select extract(hour from o.created_at at time zone 'Asia/Jakarta')::integer,
    coalesce(sum(payment_totals.amount), 0)::bigint,
    count(distinct o.id)::bigint
  from orders o
  join lateral (
    select sum(p.amount) as amount
    from payments p
    where p.order_id = o.id and p.status <> 'rejected'
  ) payment_totals on payment_totals.amount is not null
  where o.status = 'completed'
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by extract(hour from o.created_at at time zone 'Asia/Jakarta')::integer
  order by extract(hour from o.created_at at time zone 'Asia/Jakarta')::integer;
end;
$$;

create function get_category_sales(p_from timestamptz, p_to timestamptz)
returns table(category_id uuid, category_name text, "totalSales" bigint, "totalQty" bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select c.id, c.name, coalesce(sum(oi.line_total), 0)::bigint, coalesce(sum(oi.qty), 0)::bigint
  from order_items oi
  join orders o on o.id = oi.order_id
  join menu_items mi on mi.id = oi.menu_item_id
  join categories c on c.id = mi.category_id
  where o.status = 'completed' and not oi.is_voided
    and exists (select 1 from payments p where p.order_id = o.id and p.status <> 'rejected')
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by c.id, c.name
  order by c.name;
end;
$$;

create function get_item_sales(p_from timestamptz, p_to timestamptz)
returns table(menu_item_id uuid, item_name text, category_name text, "totalQty" bigint, "totalSales" bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select oi.menu_item_id, oi.item_name, c.name,
    coalesce(sum(oi.qty), 0)::bigint, coalesce(sum(oi.line_total), 0)::bigint
  from order_items oi
  join orders o on o.id = oi.order_id
  join menu_items mi on mi.id = oi.menu_item_id
  join categories c on c.id = mi.category_id
  where o.status = 'completed' and not oi.is_voided
    and exists (select 1 from payments p where p.order_id = o.id and p.status <> 'rejected')
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by oi.menu_item_id, oi.item_name, c.name
  order by sum(oi.line_total) desc, oi.item_name;
end;
$$;

create function get_method_sales(p_from timestamptz, p_to timestamptz)
returns table(method text, "totalSales" bigint, "totalTransactions" bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select p.method::text, coalesce(sum(p.amount), 0)::bigint, count(distinct o.id)::bigint
  from payments p
  join orders o on o.id = p.order_id
  where o.status = 'completed' and p.status <> 'rejected'
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by p.method
  order by p.method::text;
end;
$$;

create function get_voucher_usage(p_from timestamptz, p_to timestamptz)
returns table(voucher_id uuid, voucher_code text, voucher_name text, "usageCount" bigint, "totalDiscount" bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception using errcode = '42501', message = 'NOT_AUTHORIZED'; end if;

  return query
  select v.id, v.code, v.name, count(o.id)::bigint, coalesce(sum(o.discount_total), 0)::bigint
  from orders o
  join vouchers v on v.id = o.voucher_id
  where o.status = 'completed'
    and exists (select 1 from payments p where p.order_id = o.id and p.status <> 'rejected')
    and o.created_at >= (((p_from at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta')
    and o.created_at < ((((p_to at time zone 'Asia/Jakarta')::date + 1)::timestamp) at time zone 'Asia/Jakarta')
  group by v.id, v.code, v.name
  order by count(o.id) desc, v.code;
end;
$$;

comment on function get_sales_summary(timestamptz, timestamptz) is
  'Reports completed orders that have a non-rejected payment; rejected payment amounts are excluded.';
comment on function get_daily_sales(timestamptz, timestamptz) is
  'Groups completed, non-rejected sales by calendar date in Asia/Jakarta.';
comment on function get_hourly_sales(timestamptz, timestamptz) is
  'Groups completed, non-rejected sales by hour in Asia/Jakarta.';
comment on function get_category_sales(timestamptz, timestamptz) is
  'Reports only non-voided items from completed orders with a non-rejected payment.';
comment on function get_item_sales(timestamptz, timestamptz) is
  'Reports only non-voided items from completed orders with a non-rejected payment.';
comment on function get_method_sales(timestamptz, timestamptz) is
  'Excludes rejected payments and orders that are not completed.';
comment on function get_voucher_usage(timestamptz, timestamptz) is
  'Counts vouchers only for completed orders with a non-rejected payment.';

revoke all on function get_sales_summary(timestamptz, timestamptz) from public, anon;
revoke all on function get_daily_sales(timestamptz, timestamptz) from public, anon;
revoke all on function get_hourly_sales(timestamptz, timestamptz) from public, anon;
revoke all on function get_category_sales(timestamptz, timestamptz) from public, anon;
revoke all on function get_item_sales(timestamptz, timestamptz) from public, anon;
revoke all on function get_method_sales(timestamptz, timestamptz) from public, anon;
revoke all on function get_voucher_usage(timestamptz, timestamptz) from public, anon;
grant execute on function get_sales_summary(timestamptz, timestamptz) to authenticated;
grant execute on function get_daily_sales(timestamptz, timestamptz) to authenticated;
grant execute on function get_hourly_sales(timestamptz, timestamptz) to authenticated;
grant execute on function get_category_sales(timestamptz, timestamptz) to authenticated;
grant execute on function get_item_sales(timestamptz, timestamptz) to authenticated;
grant execute on function get_method_sales(timestamptz, timestamptz) to authenticated;
grant execute on function get_voucher_usage(timestamptz, timestamptz) to authenticated;

commit;
