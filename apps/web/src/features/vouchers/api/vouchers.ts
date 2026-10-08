import { capture } from '../../../shared/api/result';
import { getSupabaseClient } from '../../../shared/api/supabase';
import type { VoucherDraft } from '../schemas/voucher';

export interface VoucherRecord extends Omit<VoucherDraft, 'id'> {
  id: string;
  used_count: number;
  created_by: string | null;
}

export async function loadVouchers() {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('vouchers')
      .select('*')
      .order('valid_from', { ascending: false });
    if (error) throw error;
    return data as unknown as VoucherRecord[];
  });
}

export async function checkVoucherCode(code: string, currentId?: string) {
  return capture(async () => {
    let query = getSupabaseClient().from('vouchers').select('id').eq('code', code.toUpperCase());
    if (currentId) query = query.neq('id', currentId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return !data;
  });
}

export async function saveVoucher(voucher: VoucherDraft) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('upsert_voucher', {
      p_voucher: voucher,
    });
    if (error) throw error;
    return data;
  });
}

export async function activateVoucher(id: string, active: boolean) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('set_voucher_active', {
      p_voucher_id: id,
      p_is_active: active,
    });
    if (error) throw error;
    return data;
  });
}
