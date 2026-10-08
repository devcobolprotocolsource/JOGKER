import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import { validateVoucher, type VoucherInput } from '../../../shared/lib/voucher';
import type { MenuItem } from '../state/cart';

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}
export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  extra_price: number;
  is_active: boolean;
}
export interface PaymentAccount {
  id: string;
  method: 'transfer' | 'ewallet';
  provider: string;
  account_name: string;
  account_no: string;
}
export interface PaymentLine {
  method: 'cash' | 'transfer' | 'ewallet';
  amount: number;
  payment_account_id?: string;
  reference_no?: string;
  proof_path?: string;
  proof_file?: File;
  received_amount?: number;
}

export async function loadCatalog(): Promise<
  Result<{ categories: Category[]; items: MenuItem[] }>
> {
  return capture(async () => {
    const client = getSupabaseClient();
    const [categoryResult, itemResult, modifierResult] = await Promise.all([
      client
        .from('categories')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
      client
        .from('menu_items')
        .select('id, category_id, name, description, price, image_path, is_available')
        .eq('is_active', true)
        .order('sort_order'),
      client
        .from('menu_item_modifier_groups')
        .select(
          'menu_item_id, group_id, modifier_groups(id, name, min_select, max_select, modifier_options(id, group_id, name, extra_price, is_active))'
        ),
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (itemResult.error) throw itemResult.error;
    if (modifierResult.error) throw modifierResult.error;
    const groups = modifierResult.data as unknown as {
      menu_item_id: string;
      modifier_groups: {
        id: string;
        name: string;
        min_select: number;
        max_select: number;
        modifier_options: ModifierOption[];
      } | null;
    }[];
    const items = (itemResult.data as unknown as Omit<MenuItem, 'groups'>[]).map((item) => ({
      ...item,
      groups: groups
        .filter((link) => link.menu_item_id === item.id && link.modifier_groups)
        .map((link) => ({
          id: link.modifier_groups!.id,
          name: link.modifier_groups!.name,
          min_select: link.modifier_groups!.min_select,
          max_select: link.modifier_groups!.max_select,
          options: link.modifier_groups!.modifier_options.filter((option) => option.is_active),
        })),
    }));
    return { categories: categoryResult.data as Category[], items };
  });
}

export async function loadPaymentAccounts(): Promise<Result<PaymentAccount[]>> {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('payment_accounts')
      .select('id, method, provider, account_name, account_no')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data as PaymentAccount[];
  });
}

export async function validateVoucherCode(
  code: string,
  subtotal: number
): Promise<Result<{ discount: number }>> {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    const row = data as unknown as {
      code: string;
      type: 'percent' | 'nominal';
      value: number;
      min_subtotal: number;
      max_discount: number | null;
      valid_from: string;
      valid_until: string;
      total_quota: number | null;
      used_count: number;
      is_active: boolean;
    } | null;
    const voucher: VoucherInput | null = row
      ? {
          code: row.code,
          type: row.type,
          value: row.value,
          minSubtotal: row.min_subtotal,
          maxDiscount: row.max_discount,
          validFrom: row.valid_from,
          validUntil: row.valid_until,
          totalQuota: row.total_quota,
          usedCount: row.used_count,
          isActive: row.is_active,
        }
      : null;
    const result = validateVoucher(voucher, subtotal);
    if (!result.valid) throw new Error(result.reason);
    return { discount: result.discount };
  });
}

export async function createOrder(input: {
  orderType: 'dine_in' | 'takeaway';
  items: {
    menu_item_id: string;
    qty: number;
    modifier_option_ids: string[];
    note: string;
  }[];
  voucherCode?: string;
  tableLabel?: string;
  billMode?: 'none' | 'open';
}) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('create_order', {
      p_order_type: input.orderType,
      p_items: input.items,
      p_voucher_code: input.voucherCode ?? null,
      p_table_label: input.tableLabel ?? null,
      p_bill_mode: input.billMode ?? 'none',
    });
    if (error) throw error;
    return data as {
      id: string;
      order_no: string;
      grand_total: number;
      status: string;
      bill_state: string | null;
    };
  });
}

export async function submitPayment(orderId: string, payment: PaymentLine) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('submit_payment', {
      p_order_id: orderId,
      p_method: payment.method,
      p_amount: payment.amount,
      p_payment_account_id: payment.payment_account_id ?? null,
      p_reference_no: payment.reference_no ?? null,
      p_proof_path: payment.proof_path ?? null,
      p_received_amount: payment.received_amount ?? null,
    });
    if (error) throw error;
    return data;
  });
}

export async function uploadPaymentProof(orderId: string, file: File): Promise<Result<string>> {
  return capture(async () => {
    if (file.size > 5 * 1024 * 1024) throw new Error('PAYMENT_PROOF_TOO_LARGE');
    const extension =
      file.type === 'image/jpeg'
        ? 'jpg'
        : file.type === 'image/png'
          ? 'png'
          : file.type === 'image/webp'
            ? 'webp'
            : null;
    if (!extension) throw new Error('PAYMENT_PROOF_TYPE_INVALID');

    const path = `${orderId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await getSupabaseClient()
      .storage.from('payment-proofs')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return data.path;
  });
}

export async function addItemsToOpenBill(
  orderId: string,
  items: {
    menu_item_id: string;
    qty: number;
    modifier_option_ids: string[];
    note: string;
  }[]
) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('add_items_to_open_bill', {
      p_order_id: orderId,
      p_items: items,
    });
    if (error) throw error;
    return data;
  });
}

export async function applyVoucherToOrder(orderId: string, code: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('apply_voucher', {
      p_order_id: orderId,
      p_code: code.toUpperCase(),
    });
    if (error) throw error;
    return data as {
      id: string;
      grand_total: number;
      voucher_code: string | null;
      discount_total: number;
    };
  });
}

export async function closeOpenBill(orderId: string, payments: PaymentLine[]) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('close_open_bill', {
      p_order_id: orderId,
      p_payments: payments,
    });
    if (error) throw error;
    return data as {
      id: string;
      order_no: string;
      grand_total: number;
      bill_state: 'closed';
    };
  });
}
