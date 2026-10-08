import { getSupabaseClient } from '../../../../shared/api/supabase';
import { capture, type Result } from '../../../../shared/api/result';
import type { Database } from '../../../../shared/types/database';

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  method?: string;
  cashierId?: string;
  orderType?: 'dine_in' | 'takeaway';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalSales: number;
  avgTransaction: number;
}

export interface TransactionRow {
  id: string;
  order_no: string;
  created_at: string;
  order_type: 'dine_in' | 'takeaway';
  status: string;
  grand_total: number;
  method: string | null;
  created_by: string;
  full_name: string | null;
  items_summary: string;
}

export async function loadTransactions(
  filter: TransactionFilter
): Promise<Result<{ rows: TransactionRow[]; total: number }>> {
  return capture(async () => {
    const client = getSupabaseClient();
    let query = client
      .from('orders')
      .select(
        `id, order_no, created_at, order_type, status, grand_total, created_by, profiles!orders_created_by_fkey(full_name),
        payments!payments_order_id_fkey(method)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.orderType) {
      query = query.eq('order_type', filter.orderType);
    }
    if (filter.search) {
      query = query.ilike('order_no', `%${filter.search}%`);
    }
    if (filter.cashierId) {
      query = query.eq('created_by', filter.cashierId);
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 25;
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data as unknown as TransactionRow[]).map((row) => ({
      ...row,
      method: row.payments?.[0]?.method ?? null,
    }));

    return { rows, total: count ?? 0 };
  });
}

export async function loadTransactionSummary(
  filter: TransactionFilter
): Promise<Result<TransactionSummary>> {
  return capture(async () => {
    const client = getSupabaseClient();
    let query = client.from('orders').select('grand_total', { count: 'exact' });

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.orderType) {
      query = query.eq('order_type', filter.orderType);
    }
    if (filter.cashierId) {
      query = query.eq('created_by', filter.cashierId);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const totalSales = (data as { grand_total: number }[]).reduce(
      (sum, row) => sum + row.grand_total,
      0
    );
    const totalTransactions = count ?? 0;

    return {
      totalTransactions,
      totalSales,
      avgTransaction: totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0,
    };
  });
}

export interface TransactionDetail {
  order: Database['public']['Tables']['orders']['Row'] | null;
  items: Database['public']['Tables']['order_items']['Row'][];
  payments: Database['public']['Tables']['payments']['Row'][];
}

export async function loadTransactionDetail(orderId: string): Promise<Result<TransactionDetail>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const [orderResult, itemsResult, paymentsResult] = await Promise.all([
      client
        .from('orders')
        .select(
          `*, profiles!orders_created_by_fkey(full_name), vouchers!orders_voucher_id_fkey(code)`
        )
        .eq('id', orderId)
        .single(),
      client
        .from('order_items')
        .select(`*, menu_items!order_items_menu_item_id_fkey(name)`)
        .eq('order_id', orderId)
        .order('created_at'),
      client
        .from('payments')
        .select(
          `*, payment_accounts!payments_payment_account_id_fkey(provider, account_name, account_no)`
        )
        .eq('order_id', orderId)
        .order('created_at'),
    ]);

    if (orderResult.error) throw orderResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    return {
      order: orderResult.data,
      items: itemsResult.data,
      payments: paymentsResult.data,
    };
  });
}

export async function exportTransactionsCSV(filter: TransactionFilter): Promise<Result<string>> {
  return capture(async () => {
    const { rows } = await loadTransactions({ ...filter, page: 1, pageSize: 10000 });
    if (!rows) throw new Error('Failed to load transactions');

    const headers = ['Nomor Pesanan', 'Tanggal', 'Tipe', 'Status', 'Total', 'Metode', 'Kasir'];
    const lines = [headers.join(',')];

    for (const row of rows.data) {
      const date = new Date(row.created_at).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(
        [
          row.order_no,
          date,
          row.order_type,
          row.status,
          row.grand_total.toString(),
          row.method ?? '-',
          row.full_name ?? '-',
        ].join(',')
      );
    }

    return lines.join('\n');
  });
}
