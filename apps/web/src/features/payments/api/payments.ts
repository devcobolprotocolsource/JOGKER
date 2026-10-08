import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import type { PaymentAccountInput, PaymentAccountUpdateInput } from '../schemas/payment';

export interface PaymentAccount {
  id: string;
  method: 'transfer' | 'ewallet';
  provider: string;
  account_name: string;
  account_no: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentVerificationItem {
  id: string;
  order_id: string;
  order_no: string;
  method: 'transfer' | 'ewallet';
  amount: number;
  reference_no: string | null;
  proof_path: string | null;
  status: 'pending_verification' | 'verified' | 'rejected';
  payment_accounts: { provider: string; account_name: string; account_no: string } | null;
  created_at: string;
  profiles: { full_name: string } | null;
}

export async function loadPaymentAccounts(): Promise<Result<PaymentAccount[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('payment_accounts')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as PaymentAccount[];
  });
}

export async function createPaymentAccount(
  input: PaymentAccountInput
): Promise<Result<PaymentAccount>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('upsert_payment_account', {
      p_account: input,
    });
    if (error) throw error;
    return data as PaymentAccount;
  });
}

export async function updatePaymentAccount(
  id: string,
  input: PaymentAccountUpdateInput
): Promise<Result<PaymentAccount>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data: current, error: selectError } = await client
      .from('payment_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (selectError) throw selectError;
    const { data, error } = await client.rpc('upsert_payment_account', {
      p_account: { ...current, ...input, id },
    });
    if (error) throw error;
    return data as PaymentAccount;
  });
}

export async function deletePaymentAccount(id: string): Promise<Result<PaymentAccount>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('set_payment_account_active', {
      p_account_id: id,
      p_is_active: false,
    });
    if (error) throw error;
    return data as PaymentAccount;
  });
}

export async function reorderPaymentAccounts(
  updates: { id: string; sort_order: number }[]
): Promise<Result<void>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data: accounts, error: selectError } = await client
      .from('payment_accounts')
      .select('*')
      .in(
        'id',
        updates.map(({ id }) => id)
      );
    if (selectError) throw selectError;
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    for (const update of updates) {
      const account = accountsById.get(update.id);
      if (!account) throw new Error('PAYMENT_ACCOUNT_NOT_FOUND');
      const { error } = await client.rpc('upsert_payment_account', {
        p_account: { ...account, sort_order: update.sort_order },
      });
      if (error) throw error;
    }
  });
}

export async function loadPendingVerifications(): Promise<Result<PaymentVerificationItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('payments')
      .select(
        `*, orders!payments_order_id_fkey(order_no), payment_accounts!payments_payment_account_id_fkey(provider, account_name, account_no), profiles!payments_verified_by_fkey(full_name)`
      )
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as PaymentVerificationItem[];
  });
}

export async function verifyPayment(
  paymentId: string,
  approve: boolean,
  note?: string
): Promise<Result<{ order_completed: boolean }>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('verify_payment', {
      p_payment_id: paymentId,
      p_approve: approve,
      p_note: note ?? null,
    });
    if (error) throw error;
    return data as { order_completed: boolean };
  });
}

export async function getPaymentProofUrl(path: string): Promise<Result<string>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.storage.from('payment-proofs').createSignedUrl(path, 600);
    if (error) throw error;
    return data.signedUrl;
  });
}
