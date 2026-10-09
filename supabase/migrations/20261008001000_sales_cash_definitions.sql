begin;

comment on function get_sales_summary(timestamptz, timestamptz) is
  'Revenue reporting includes completed orders only and excludes rejected payments. Pending non-rejected payments remain represented as configured by the report contract.';
comment on function get_daily_sales(timestamptz, timestamptz) is
  'Daily revenue reporting includes completed orders only and excludes rejected payments; dates use Asia/Jakarta.';
comment on function get_hourly_sales(timestamptz, timestamptz) is
  'Hourly revenue reporting includes completed orders only and excludes rejected payments; hours use Asia/Jakarta.';
comment on function get_category_sales(timestamptz, timestamptz) is
  'Category revenue reporting includes non-voided items in completed orders with non-rejected payments.';
comment on function get_item_sales(timestamptz, timestamptz) is
  'Item revenue reporting includes non-voided items in completed orders with non-rejected payments.';
comment on function get_method_sales(timestamptz, timestamptz) is
  'Payment-method revenue reporting includes completed orders and excludes rejected payments.';
comment on function get_voucher_usage(timestamptz, timestamptz) is
  'Voucher reporting includes completed orders with non-rejected payments.';
comment on function close_shift(bigint, text) is
  'Cash reconciliation is independent of sales reports: expected cash is opening cash plus verified cash payments in the shift, less recorded cash refunds, regardless of order completion status.';

commit;
