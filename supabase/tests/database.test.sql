begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data) values
  ('90000000-0000-4000-8000-000000000001', 'admin-test@jokger.local', '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000002', 'super-test@jokger.local', '{}'::jsonb),
  ('90000000-0000-4000-8000-000000000003', 'inactive-test@jokger.local', '{}'::jsonb)
on conflict (id) do nothing;
update profiles set role = 'super_admin' where id = '90000000-0000-4000-8000-000000000002';
update profiles set is_active = false where id = '90000000-0000-4000-8000-000000000003';

insert into store_settings(id, store_name) values (1, 'JOKGER Test') on conflict (id) do nothing;
insert into categories(id, name, sort_order) values
  ('91000000-0000-4000-8000-000000000001', 'Test Kopi', 99)
on conflict (id) do nothing;
insert into menu_items(id, category_id, name, price) values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Test Americano', 18000)
on conflict (id) do nothing;
insert into inventory_items(id, name, unit, current_qty, min_qty, unit_cost) values
  ('93000000-0000-4000-8000-000000000001', 'Test beans', 'gram', 1000, 500, 100)
on conflict (id) do nothing;
insert into recipe_lines(menu_item_id, inventory_item_id, qty_per_serving) values
  ('92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 18)
on conflict (menu_item_id, inventory_item_id) do nothing;
insert into payment_accounts(id, method, provider, account_name, account_no) values
  ('94000000-0000-4000-8000-000000000001', 'transfer', 'TEST BANK', 'JOKGER', '1234567890')
on conflict (id) do nothing;
insert into vouchers(id, code, name, type, value, valid_from, valid_until, created_by) values
  ('95000000-0000-4000-8000-000000000001', 'TEST10', 'Diskon tes', 'percent', 10,
   now() - interval '1 day', now() + interval '1 day', '90000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

create temporary table rpc_test_data(name text primary key, id uuid, amount bigint);
grant all on rpc_test_data to authenticated;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select ok(
  (select count(*) = 33 from pg_proc
   where pronamespace = 'public'::regnamespace and proname = any(array[
     'open_shift', 'close_shift', 'create_order', 'add_items_to_open_bill', 'void_order_item',
     'cancel_order', 'change_order_status', 'apply_voucher', 'submit_payment', 'verify_payment',
     'close_open_bill', 'finalize_stock_opname', 'record_stock_movement', 'open_stock_opname',
     'save_stock_opname_count', 'update_store_settings', 'upsert_category', 'upsert_menu_item',
     'set_menu_item_available', 'upsert_inventory_item', 'upsert_voucher', 'set_voucher_active',
     'upsert_payment_account', 'set_payment_account_active',
     'get_sales_summary', 'get_daily_sales', 'get_hourly_sales', 'get_category_sales',
     'get_item_sales', 'get_method_sales', 'get_voucher_usage',
     'set_staff_role', 'set_staff_active'
   ]) and prosecdef),
  'Semua RPC publik wajib ada dan SECURITY DEFINER'
);
select ok(
  (select count(*) = 22 and bool_and(rowsecurity) from pg_tables where schemaname = 'public'),
  'Semua tabel public mengaktifkan RLS'
);
select ok(not has_table_privilege('authenticated', 'public.orders', 'INSERT'), 'Client tidak dapat menulis order langsung');
select ok(not has_table_privilege('authenticated', 'public.payments', 'UPDATE'), 'Client tidak dapat mengubah pembayaran langsung');
select ok(not has_function_privilege('anon', 'public.create_order(public.order_type,jsonb,text,text,text)'::regprocedure, 'EXECUTE'),
  'Anon tidak dapat menjalankan RPC transaksi');

set local role authenticated;
select is(is_staff(), true, 'Staff aktif lolos helper is_staff');
select is(is_super_admin(), false, 'Admin bukan super admin');

select is((open_shift(50000)).opening_cash, 50000::bigint, 'open_shift menyimpan saldo awal');
select throws_ok($$select open_shift(-1)$$, 'P0001', 'OPENING_CASH_INVALID', 'Saldo awal negatif ditolak');

insert into rpc_test_data(name, id)
select 'cash_order', (created.order_value).id
from (select create_order('takeaway',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":2}]'::jsonb) as order_value) created;
select matches((select order_no from orders where id = (select id from rpc_test_data where name = 'cash_order')),
  '^JKG-[0-9]{8}-[0-9]{4}$', 'Nomor order memakai tanggal lokal dan nomor urut empat digit');
select is((select subtotal from orders where id = (select id from rpc_test_data where name = 'cash_order')),
  36000::bigint, 'create_order menghitung subtotal dari snapshot harga');
select is((select current_qty from inventory_items where id = '93000000-0000-4000-8000-000000000001'),
  964::numeric, 'create_order mengurangi stok sesuai resep');

insert into rpc_test_data(name, id)
select 'cash_payment', (payment_value).id
from (select submit_payment((select id from rpc_test_data where name = 'cash_order'),
  'cash', 36000, null, null, null, 50000) as payment_value) payment;
select is((select status::text from payments where id = (select id from rpc_test_data where name = 'cash_payment')),
  'verified', 'Pembayaran tunai langsung terverifikasi');
select is((change_order_status((select id from rpc_test_data where name = 'cash_order'), 'processing')).status,
  'processing'::order_status, 'Pesanan dapat diproses');
select is((change_order_status((select id from rpc_test_data where name = 'cash_order'), 'ready')).status,
  'ready'::order_status, 'Pesanan dapat ditandai siap');
select is((change_order_status((select id from rpc_test_data where name = 'cash_order'), 'completed')).status,
  'completed'::order_status, 'Pesanan lunas dapat diselesaikan');
select is(
  (get_sales_summary(now() - interval '1 day', now() + interval '1 day') ->> 'totalSales')::bigint,
  36000::bigint,
  'Laporan ringkasan memakai total order selesai dan pembayaran non-rejected'
);
select is(
  (select "totalSales" from get_daily_sales(now() - interval '1 day', now() + interval '1 day')),
  36000::bigint,
  'Laporan harian mengembalikan total penjualan pada zona lokal'
);
select is(
  (select "totalSales" from get_hourly_sales(now() - interval '1 day', now() + interval '1 day')),
  36000::bigint,
  'Laporan per jam mengembalikan total penjualan'
);
select is(
  (select "totalSales" from get_category_sales(now() - interval '1 day', now() + interval '1 day')),
  36000::bigint,
  'Laporan kategori menghitung item yang tidak di-void'
);
select is(
  (select "totalQty" from get_item_sales(now() - interval '1 day', now() + interval '1 day')),
  2::bigint,
  'Laporan item mengembalikan kuantitas item'
);
select is(
  (select "totalSales" from get_method_sales(now() - interval '1 day', now() + interval '1 day')),
  36000::bigint,
  'Laporan metode pembayaran menghitung pembayaran non-rejected'
);
select is(
  (select count(*) from get_voucher_usage(now() - interval '1 day', now() + interval '1 day')),
  0::bigint,
  'Laporan voucher mengembalikan array kosong bila tidak ada voucher selesai'
);
select throws_ok($$select change_order_status((select id from rpc_test_data where name = 'cash_order'), 'processing')$$,
  'P0001', 'ORDER_STATUS_TRANSITION_INVALID', 'Transisi dari status terminal ditolak');

insert into rpc_test_data(name, id)
select 'voucher_order', (created.order_value).id
from (select create_order('takeaway',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb,
  'test10') as order_value) created;
select is((select discount_total from orders where id = (select id from rpc_test_data where name = 'voucher_order')),
  1800::bigint, 'Voucher persen dihitung dari subtotal');
select is((select used_count from vouchers where code = 'TEST10'), 1, 'Voucher dihitung terpakai saat order dibuat');
select is((cancel_order((select id from rpc_test_data where name = 'voucher_order'), 'Pesanan ganda')).status,
  'cancelled'::order_status, 'cancel_order membatalkan pesanan dengan alasan');
select is((select used_count from vouchers where code = 'TEST10'), 0, 'Pembatalan mengembalikan kuota voucher');
select is((select current_qty from inventory_items where id = '93000000-0000-4000-8000-000000000001'),
  964::numeric, 'Pembatalan mengembalikan stok resep');

select is((upsert_category(null, 'Kategori RPC', 10, true)).name,
  'Kategori RPC', 'RPC kategori membuat kategori baru');
select throws_ok($$select upsert_category('ffffffff-ffff-4fff-8fff-ffffffffffff', 'Tidak ada', 0, true)$$,
  'P0001', 'CATEGORY_NOT_FOUND', 'RPC kategori menolak update kategori yang tidak ada');
insert into rpc_test_data(name, id)
select 'menu_rpc', (upsert_menu_item(jsonb_build_object(
  'category_id', '91000000-0000-4000-8000-000000000001', 'name', 'Menu RPC', 'price', 21000
))).id;
select is((set_menu_item_available((select id from rpc_test_data where name = 'menu_rpc'), false)).is_available,
  false, 'RPC toggle ketersediaan menu bekerja');
select is((set_menu_item_available((select id from rpc_test_data where name = 'menu_rpc'), true)).is_available,
  true, 'RPC toggle dapat dikembalikan');
insert into rpc_test_data(name, id)
select 'inventory_rpc', (upsert_inventory_item(jsonb_build_object(
  'name', 'Bahan RPC', 'unit', 'ml', 'min_qty', 10, 'unit_cost', 25
))).id;
select is((record_stock_movement((select id from rpc_test_data where name = 'inventory_rpc'),
  'purchase', 5, 'Stok uji')).qty_change, 5::numeric, 'RPC pembelian memperbarui stok bahan baru');
select throws_ok($$select record_stock_movement((select id from rpc_test_data where name = 'inventory_rpc'),
  'waste', 6, 'Terlalu banyak')$$, 'P0001', 'STOCK_INSUFFICIENT', 'Pergerakan tidak boleh membuat stok negatif');

insert into rpc_test_data(name, id)
select 'voucher_rpc', (upsert_voucher(jsonb_build_object(
  'code', 'CREATED', 'name', 'Voucher RPC', 'type', 'percent', 'value', 10,
  'valid_from', now() - interval '1 day', 'valid_until', now() + interval '1 day'
))).id;
select is((set_voucher_active((select id from rpc_test_data where name = 'voucher_rpc'), false)).is_active,
  false, 'RPC voucher menonaktifkan voucher');
select is((set_voucher_active((select id from rpc_test_data where name = 'voucher_rpc'), true)).is_active,
  true, 'RPC voucher dapat mengaktifkan kembali voucher');
insert into rpc_test_data(name, id)
select 'account_rpc', (upsert_payment_account(jsonb_build_object(
  'method', 'ewallet', 'provider', 'DANA TEST', 'account_name', 'JOKGER', 'account_no', '0800123456'
))).id;
select is((set_payment_account_active((select id from rpc_test_data where name = 'account_rpc'), false)).is_active,
  false, 'RPC rekening dapat menonaktifkan rekening');
select is((set_payment_account_active((select id from rpc_test_data where name = 'account_rpc'), true)).is_active,
  true, 'RPC rekening dapat mengaktifkan rekening');

insert into rpc_test_data(name, id)
select 'apply_voucher_order', (create_order('takeaway',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb)).id;
select is((apply_voucher((select id from rpc_test_data where name = 'apply_voucher_order'), 'CREATED')).discount_total,
  1800::bigint, 'RPC apply_voucher menerapkan nominal diskon');
select throws_ok($$select apply_voucher((select id from rpc_test_data where name = 'apply_voucher_order'), 'MISSING')$$,
  'P0001', 'VOUCHER_NOT_FOUND', 'RPC apply_voucher menolak kode yang tidak ditemukan');
select is((select voucher_code from orders where id = (select id from rpc_test_data where name = 'apply_voucher_order')),
  'CREATED', 'Kegagalan voucher mempertahankan voucher sebelumnya (rollback)');
select is((cancel_order((select id from rpc_test_data where name = 'apply_voucher_order'), 'Selesai uji')).status,
  'cancelled'::order_status, 'Pembatalan order mengembalikan voucher manual');

insert into rpc_test_data(name, id)
select 'transfer_order', (create_order('takeaway',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb)).id;
insert into rpc_test_data(name, id)
select 'transfer_submit', (submit_payment((select id from rpc_test_data where name = 'transfer_order'),
  'transfer', 18000, '94000000-0000-4000-8000-000000000001', 'REF-123')).id;
select is((select status::text from payments where id = (select id from rpc_test_data where name = 'transfer_submit')),
  'pending_verification', 'RPC submit_payment membuat transfer menunggu verifikasi');
select is((verify_payment((select id from rpc_test_data where name = 'transfer_submit'), false, 'Referensi tidak cocok')).status,
  'rejected'::payment_status, 'RPC verifikasi dapat menolak pembayaran');
select throws_ok($$select verify_payment((select id from rpc_test_data where name = 'transfer_submit'), true)$$,
  'P0001', 'PAYMENT_ALREADY_REVIEWED', 'Pembayaran yang sudah ditolak tidak dapat diverifikasi ulang');

insert into rpc_test_data(name, id)
select 'failed_bill', (create_order('dine_in',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb,
  null, 'Meja rollback', 'open')).id;
select throws_ok($$select close_open_bill((select id from rpc_test_data where name = 'failed_bill'),
  '[{"method":"cash","amount":1}]'::jsonb)$$,
  'P0001', 'PAYMENT_TOTAL_MISMATCH', 'Penutupan bill menolak jumlah pembayaran yang salah');
select is((select bill_state::text from orders where id = (select id from rpc_test_data where name = 'failed_bill')),
  'open', 'Penutupan gagal mempertahankan bill tetap terbuka (rollback)');
select is((select count(*) from payments where order_id = (select id from rpc_test_data where name = 'failed_bill')),
  0::bigint, 'Penutupan gagal tidak menyimpan pembayaran parsial (rollback)');
select is((cancel_order((select id from rpc_test_data where name = 'failed_bill'), 'Uji rollback')).bill_state,
  'closed'::bill_state, 'Pembatalan menutup open bill secara atomik');

insert into rpc_test_data(name, amount) select 'order_count_before_failure', count(*) from orders;
insert into rpc_test_data(name, amount) select 'stock_before_failure', current_qty::bigint
from inventory_items where id = '93000000-0000-4000-8000-000000000001';
select throws_ok($$select create_order('takeaway',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":100}]'::jsonb)$$,
  'P0001', 'STOCK_INSUFFICIENT', 'Order dengan stok tidak cukup ditolak');
select is((select count(*) from orders),
  (select amount from rpc_test_data where name = 'order_count_before_failure'),
  'Order gagal tidak meninggalkan baris order (rollback)');
select is((select current_qty from inventory_items where id = '93000000-0000-4000-8000-000000000001'),
  (select amount::numeric from rpc_test_data where name = 'stock_before_failure'),
  'Order gagal tidak mengubah stok (rollback)');

insert into rpc_test_data(name, id)
select 'void_order', (created.order_value).id
from (select create_order('dine_in',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb) as order_value) created;
insert into rpc_test_data(name, id)
select 'void_item', id from order_items
where order_id = (select id from rpc_test_data where name = 'void_order') limit 1;
select is((void_order_item((select id from rpc_test_data where name = 'void_item'), 'Salah input')).grand_total,
  0::bigint, 'Void item menghitung ulang grand total');
select is((select current_qty from inventory_items where id = '93000000-0000-4000-8000-000000000001'),
  (select amount::numeric from rpc_test_data where name = 'stock_before_failure'),
  'Void item mengembalikan stok');
select throws_ok($$select void_order_item((select id from rpc_test_data where name = 'void_item'), '')$$,
  'P0001', 'REASON_REQUIRED', 'Void tanpa alasan ditolak');

insert into rpc_test_data(name, id)
select 'open_bill', (created.order_value).id
from (select create_order('dine_in',
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb,
  null, 'Meja 1', 'open') as order_value) created;
select is((add_items_to_open_bill((select id from rpc_test_data where name = 'open_bill'),
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb)).subtotal,
  36000::bigint, 'Item dapat ditambahkan ke open bill');
select throws_ok($$select close_shift(0)$$, 'P0001', 'OPEN_BILL_REMAINS', 'Shift tidak dapat ditutup selama open bill ada');
select is((close_open_bill((select id from rpc_test_data where name = 'open_bill'), jsonb_build_array(
  jsonb_build_object('method', 'cash', 'amount', 18000, 'received_amount', 20000),
  jsonb_build_object('method', 'transfer', 'amount', 18000,
    'payment_account_id', '94000000-0000-4000-8000-000000000001', 'reference_no', 'TRX-TEST')
))).bill_state, 'closed'::bill_state, 'Open bill mendukung pembayaran split dan penutupan');
select throws_ok($$select add_items_to_open_bill((select id from rpc_test_data where name = 'open_bill'),
  '[{"menu_item_id":"92000000-0000-4000-8000-000000000001","qty":1}]'::jsonb)$$,
  'P0001', 'BILL_CLOSED', 'Bill tertutup tidak menerima item baru');
insert into rpc_test_data(name, id)
select 'transfer_payment', id from payments
where order_id = (select id from rpc_test_data where name = 'open_bill') and method = 'transfer';
select is((verify_payment((select id from rpc_test_data where name = 'transfer_payment'), true, 'Cocok')).status,
  'verified'::payment_status, 'Pembayaran transfer dapat diverifikasi');

select is((close_shift(104000)).difference, 0::bigint, 'Tutup shift mencatat selisih kas dengan benar');
select throws_ok($$select close_shift(0)$$, 'P0001', 'SHIFT_NOT_OPEN', 'Tutup shift kedua ditolak');

select is((record_stock_movement('93000000-0000-4000-8000-000000000001', 'purchase', 100, 'Restok')).qty_change,
  100::numeric, 'Pergerakan pembelian membuat ledger masuk');
insert into rpc_test_data(name, id)
select 'opname', (open_stock_opname()).id;
select ok((select count(*) = (select count(*) from inventory_items) from (
  select save_stock_opname_count(
    (select id from rpc_test_data where name = 'opname'), inventory_item_id, system_qty
  ) from stock_opname_lines where opname_id = (select id from rpc_test_data where name = 'opname')
) as saved_counts), 'Autosave menyimpan hitungan untuk seluruh bahan');
insert into rpc_test_data(name, amount)
select 'opname_count', current_qty - 5 from inventory_items where id = '93000000-0000-4000-8000-000000000001';
select is((save_stock_opname_count((select id from rpc_test_data where name = 'opname'),
  '93000000-0000-4000-8000-000000000001', (select amount from rpc_test_data where name = 'opname_count'))).counted_qty,
  (select amount::numeric from rpc_test_data where name = 'opname_count'), 'Autosave hitung opname menyimpan jumlah');
select is((finalize_stock_opname((select id from rpc_test_data where name = 'opname'))).status,
  'finalized', 'Opname dapat difinalisasi');
select is((select current_qty from inventory_items where id = '93000000-0000-4000-8000-000000000001'),
  (select amount::numeric from rpc_test_data where name = 'opname_count'), 'Finalisasi menerapkan selisih stok');
select throws_ok($$select save_stock_opname_count((select id from rpc_test_data where name = 'opname'),
  '93000000-0000-4000-8000-000000000001', 10)$$, 'P0001', 'OPNAME_FINALIZED', 'Opname final tidak dapat diubah');

select throws_ok($$select update_store_settings('{"store_name":"Dilarang"}'::jsonb)$$,
  '42501', 'NOT_AUTHORIZED', 'Admin tidak dapat mengubah pengaturan super admin');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is((update_store_settings('{"store_name":"JOKGER Super"}'::jsonb)).store_name,
  'JOKGER Super', 'Super admin dapat mengubah pengaturan');
select ok((select count(*) > 0 from audit_logs), 'Super admin dapat membaca audit log');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select is(is_staff(), false, 'Akun nonaktif tidak dianggap staff');
select is((select count(*) from orders), 0::bigint, 'Akun nonaktif tidak dapat membaca data operasional');

select finish();
rollback;