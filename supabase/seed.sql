insert into store_settings(id, store_name, address, phone, primary_color, accent_color,
  font_family, tax_percent, service_percent, rounding_rule, receipt_header, receipt_footer, paper_width_mm)
values (1, 'JOKGER Coffee', 'Jl. Kopi No. 1, Jakarta', '021-555-0101', '#6F4E37', '#F5E6D3',
  'Inter', 0, 0, 'none', 'Terima kasih sudah berkunjung', 'Sampai jumpa kembali', 58)
on conflict (id) do nothing;

insert into categories(id, name, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'Kopi', 1),
  ('10000000-0000-4000-8000-000000000002', 'Non-Kopi', 2),
  ('10000000-0000-4000-8000-000000000003', 'Makanan', 3)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into menu_items(id, category_id, name, description, price, sort_order) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Americano', 'Espresso dan air', 18000, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Cafe Latte', 'Espresso dan susu', 22000, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Matcha Latte', 'Matcha dan susu', 24000, 1),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Croissant', 'Pastry mentega', 19000, 1)
on conflict (id) do update set name = excluded.name, price = excluded.price,
  category_id = excluded.category_id, sort_order = excluded.sort_order;

insert into inventory_items(id, name, unit, current_qty, min_qty, unit_cost) values
  ('30000000-0000-4000-8000-000000000001', 'Biji kopi', 'gram', 0, 300, 250),
  ('30000000-0000-4000-8000-000000000002', 'Susu', 'ml', 0, 1000, 35),
  ('30000000-0000-4000-8000-000000000003', 'Bubuk matcha', 'gram', 0, 100, 900),
  ('30000000-0000-4000-8000-000000000004', 'Croissant', 'pcs', 0, 5, 9000)
on conflict (id) do update set name = excluded.name, unit = excluded.unit,
  min_qty = excluded.min_qty, unit_cost = excluded.unit_cost;

with opening_stock(inventory_item_id, qty_change) as (
  values
    ('30000000-0000-4000-8000-000000000001'::uuid, 5000::numeric),
    ('30000000-0000-4000-8000-000000000002'::uuid, 10000::numeric),
    ('30000000-0000-4000-8000-000000000003'::uuid, 1000::numeric),
    ('30000000-0000-4000-8000-000000000004'::uuid, 40::numeric)
), new_movements as (
  insert into stock_movements(inventory_item_id, movement_type, qty_change, reference_id, note)
  select opening_stock.inventory_item_id, 'purchase', opening_stock.qty_change, 'seed:baseline-v1', 'Stok awal lokal'
  from opening_stock
  where not exists (
    select 1 from stock_movements where reference_id = 'seed:baseline-v1'
      and stock_movements.inventory_item_id = opening_stock.inventory_item_id
  )
  returning inventory_item_id, qty_change
)
update inventory_items set current_qty = inventory_items.current_qty + new_movements.qty_change
from new_movements where inventory_items.id = new_movements.inventory_item_id;

insert into recipe_lines(menu_item_id, inventory_item_id, qty_per_serving) values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 18),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 18),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 180),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 5),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 180),
  ('20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 1)
on conflict (menu_item_id, inventory_item_id) do update
set qty_per_serving = excluded.qty_per_serving;

insert into payment_accounts(id, method, provider, account_name, account_no, sort_order) values
  ('40000000-0000-4000-8000-000000000001', 'transfer', 'BCA', 'JOKGER Coffee', '1234567890', 1),
  ('40000000-0000-4000-8000-000000000002', 'ewallet', 'DANA', 'JOKGER Coffee', '081234567890', 2)
on conflict (id) do update set method = excluded.method, provider = excluded.provider,
  account_name = excluded.account_name, account_no = excluded.account_no, sort_order = excluded.sort_order;