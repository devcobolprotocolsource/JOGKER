create extension if not exists pgcrypto with schema extensions;

create type role_type as enum ('super_admin', 'admin');
create type order_type as enum ('dine_in', 'takeaway');
create type order_status as enum ('new', 'processing', 'ready', 'completed', 'cancelled');
create type bill_state as enum ('open', 'closed');
create type payment_method as enum ('cash', 'transfer', 'ewallet');
create type payment_status as enum ('pending_verification', 'verified', 'rejected');
create type voucher_type as enum ('percent', 'nominal');
create type movement_type as enum ('purchase', 'sale', 'void_return', 'adjustment', 'opname', 'waste');
create type shift_status as enum ('open', 'closed');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role role_type not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table store_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null,
  address text,
  phone text,
  logo_path text,
  primary_color text not null default '#6F4E37',
  accent_color text not null default '#F5E6D3',
  font_family text not null default 'Inter',
  tax_percent numeric(5,2) not null default 0 check (tax_percent between 0 and 100),
  service_percent numeric(5,2) not null default 0 check (service_percent between 0 and 100),
  rounding_rule text not null default 'none' check (rounding_rule in ('none', 'up_100', 'nearest_100')),
  receipt_header text,
  receipt_footer text,
  paper_width_mm int not null default 58 check (paper_width_mm in (58, 80)),
  require_verified_payment_before_complete boolean not null default true,
  allow_negative_stock boolean not null default false,
  open_hours jsonb not null default '{}'::jsonb,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table payment_accounts (
  id uuid primary key default gen_random_uuid(),
  method payment_method not null check (method in ('transfer', 'ewallet')),
  provider text not null,
  account_name text not null,
  account_no text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  description text,
  price bigint not null check (price >= 0),
  image_path text,
  is_available boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table modifier_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= min_select)
);

create table modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references modifier_groups(id) on delete cascade,
  name text not null,
  extra_price bigint not null default 0 check (extra_price >= 0),
  is_active boolean not null default true
);

create table menu_item_modifier_groups (
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  group_id uuid not null references modifier_groups(id) on delete cascade,
  primary key (menu_item_id, group_id)
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  current_qty numeric(14,3) not null default 0,
  min_qty numeric(14,3) not null default 0 check (min_qty >= 0),
  unit_cost bigint not null default 0 check (unit_cost >= 0),
  is_active boolean not null default true
);

create table recipe_lines (
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  qty_per_serving numeric(14,3) not null check (qty_per_serving > 0),
  primary key (menu_item_id, inventory_item_id)
);

create table stock_movements (
  id bigint generated always as identity primary key,
  inventory_item_id uuid not null references inventory_items(id),
  movement_type movement_type not null,
  qty_change numeric(14,3) not null check (qty_change <> 0),
  reference_id text,
  note text,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table stock_opnames (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  opened_by uuid references profiles(id),
  opened_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table stock_opname_lines (
  opname_id uuid not null references stock_opnames(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  system_qty numeric(14,3) not null,
  counted_qty numeric(14,3) check (counted_qty is null or counted_qty >= 0),
  primary key (opname_id, inventory_item_id)
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  status shift_status not null default 'open',
  opened_by uuid not null references profiles(id),
  opened_at timestamptz not null default now(),
  opening_cash bigint not null check (opening_cash >= 0),
  closed_by uuid references profiles(id),
  closed_at timestamptz,
  expected_cash bigint,
  actual_cash bigint,
  difference bigint,
  note text
);

create unique index one_open_shift on shifts (status) where status = 'open';

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  name text not null,
  type voucher_type not null,
  value bigint not null check (value > 0),
  min_subtotal bigint not null default 0 check (min_subtotal >= 0),
  max_discount bigint check (max_discount is null or max_discount >= 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  total_quota int check (total_quota is null or total_quota >= 0),
  used_count int not null default 0 check (used_count >= 0),
  per_order_limit int not null default 1 check (per_order_limit > 0),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  constraint valid_range check (valid_until > valid_from),
  constraint percent_range check (type <> 'percent' or value between 1 and 100)
);

create table daily_sequences (
  day date primary key,
  last_no int not null check (last_no > 0)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  shift_id uuid not null references shifts(id),
  order_type order_type not null,
  status order_status not null default 'new',
  bill_state bill_state,
  table_label text,
  customer_name text,
  subtotal bigint not null default 0,
  discount_total bigint not null default 0,
  service_amount bigint not null default 0,
  tax_amount bigint not null default 0,
  rounding_amount bigint not null default 0,
  grand_total bigint not null default 0,
  voucher_id uuid references vouchers(id),
  voucher_code text,
  cancel_reason text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (subtotal >= 0 and discount_total >= 0 and grand_total >= 0)
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  item_name text not null,
  unit_price bigint not null check (unit_price >= 0),
  modifiers jsonb not null default '[]'::jsonb check (jsonb_typeof(modifiers) = 'array'),
  qty int not null check (qty > 0),
  line_total bigint not null check (line_total >= 0),
  note text,
  is_voided boolean not null default false,
  void_reason text,
  voided_by uuid references profiles(id),
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  method payment_method not null,
  payment_account_id uuid references payment_accounts(id),
  amount bigint not null check (amount > 0),
  received_amount bigint check (received_amount is null or received_amount >= amount),
  status payment_status not null default 'pending_verification',
  proof_path text,
  reference_no text,
  note text,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check ((method = 'cash' and payment_account_id is null) or method <> 'cash')
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  amount bigint not null check (amount > 0),
  reason text not null,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references vouchers(id),
  order_id uuid not null unique references orders(id),
  discount bigint not null check (discount >= 0),
  created_at timestamptz not null default now()
);

create index menu_items_category_active_idx on menu_items(category_id, sort_order) where is_active;
create index stock_movements_item_created_idx on stock_movements(inventory_item_id, created_at desc);
create index orders_created_at_idx on orders(created_at desc);
create index orders_shift_status_idx on orders(shift_id, status);
create index orders_active_idx on orders(status, created_at desc) where status in ('new', 'processing', 'ready');
create index order_items_order_idx on order_items(order_id, created_at);
create index payments_order_status_idx on payments(order_id, status);
create index payments_pending_idx on payments(created_at) where status = 'pending_verification';
create index audit_logs_created_idx on audit_logs(created_at desc);
create index audit_logs_entity_idx on audit_logs(entity, entity_id);
create index vouchers_active_period_idx on vouchers(valid_from, valid_until) where is_active;

create function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger menu_items_set_updated_at
before update on menu_items
for each row execute function set_updated_at();

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

create function create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Staff'), 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function create_profile_for_auth_user();