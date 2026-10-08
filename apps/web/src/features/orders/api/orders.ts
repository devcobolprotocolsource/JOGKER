import { capture } from '../../../shared/api/result';
import { getSupabaseClient } from '../../../shared/api/supabase';
import type { OrderStatus } from '../../../shared/lib/order-status';

export interface OrderSummary {
  id: string;
  order_no: string;
  order_type: 'dine_in' | 'takeaway';
  status: OrderStatus;
  bill_state: 'open' | 'closed' | null;
  table_label: string | null;
  customer_name: string | null;
  grand_total: number;
  created_at: string;
  created_by: string;
  item_count: number;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  discount_total: number;
  service_amount: number;
  tax_amount: number;
  rounding_amount: number;
  voucher_code: string | null;
  cancel_reason: string | null;
  closed_at: string | null;
  order_items: {
    id: string;
    item_name: string;
    unit_price: number;
    modifiers: { name: string; extra_price: number }[];
    qty: number;
    line_total: number;
    note: string | null;
    is_voided: boolean;
    void_reason: string | null;
  }[];
  payments: {
    id: string;
    method: 'cash' | 'transfer' | 'ewallet';
    amount: number;
    received_amount: number | null;
    status: 'pending_verification' | 'verified' | 'rejected';
    proof_path: string | null;
    reference_no: string | null;
    note: string | null;
    created_at: string;
    payment_accounts: {
      provider: string;
      account_name: string;
      account_no: string;
    } | null;
  }[];
  audit_logs: {
    id: number;
    action: string;
    payload: unknown;
    created_at: string;
  }[];
}

export async function loadOrders(): Promise<
  { ok: true; data: OrderSummary[] } | { ok: false; error: { message: string } }
> {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('orders')
      .select(
        'id, order_no, order_type, status, bill_state, table_label, customer_name, grand_total, created_at, created_by, order_items(qty, is_voided)'
      )
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) throw error;
    return (
      data as unknown as (Omit<OrderSummary, 'item_count'> & {
        order_items: { qty: number; is_voided: boolean }[];
      })[]
    ).map(({ order_items, ...order }) => ({
      ...order,
      item_count: order_items
        .filter((item) => !item.is_voided)
        .reduce((count, item) => count + item.qty, 0),
    }));
  });
}

export async function changeOrderStatus(orderId: string, status: OrderStatus) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('change_order_status', {
      p_order_id: orderId,
      p_to_status: status,
    });
    if (error) throw error;
    return data;
  });
}

export async function cancelOrder(orderId: string, reason: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('cancel_order', {
      p_order_id: orderId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  });
}

export async function loadOrderDetail(orderId: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('orders')
      .select(
        '*, order_items(*), payments(*, payment_accounts(provider, account_name, account_no))'
      )
      .eq('id', orderId)
      .single();
    if (error) throw error;
    const { data: audit, error: auditError } = await getSupabaseClient()
      .from('audit_logs')
      .select('id, action, payload, created_at')
      .eq('entity', 'order')
      .eq('entity_id', orderId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (auditError) throw auditError;
    const row = data as unknown as Omit<OrderDetail, 'audit_logs' | 'item_count'> & {
      order_items: OrderDetail['order_items'];
    };
    return {
      ...row,
      item_count: row.order_items
        .filter((item) => !item.is_voided)
        .reduce((count, item) => count + item.qty, 0),
      audit_logs: audit ?? [],
    } as OrderDetail;
  });
}

export async function voidOrderItem(itemId: string, reason: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('void_order_item', {
      p_item_id: itemId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  });
}

export async function verifyPayment(paymentId: string, approve: boolean, note?: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('verify_payment', {
      p_payment_id: paymentId,
      p_approve: approve,
      p_note: note ?? null,
    });
    if (error) throw error;
    return data;
  });
}

export async function createProofUrl(path: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .storage.from('payment-proofs')
      .createSignedUrl(path, 600);
    if (error) throw error;
    return data.signedUrl;
  });
}
