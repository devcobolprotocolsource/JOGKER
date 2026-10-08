import { createResource } from 'solid-js';
import {
  loadPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  reorderPaymentAccounts,
} from '../api/payments';
import {
  setPaymentAccounts,
  setPaymentsLoading,
  setPaymentsError,
  addPaymentAccount,
  updatePaymentAccountInState,
  removePaymentAccountFromState,
  reorderPaymentAccountsInState,
  getPaymentsState,
} from '../state/payments';
import type { PaymentAccount } from '../api/payments';

export function createPaymentAccountsResource() {
  const [accounts, { refetch }] = createResource(
    () => true,
    async () => {
      setPaymentsLoading(true);
      setPaymentsError(null);
      const result = await loadPaymentAccounts();
      setPaymentsLoading(false);
      if (!result.ok) {
        setPaymentsError(result.error.message);
        return [];
      }
      setPaymentAccounts(result.data);
      return result.data;
    },
    { initialValue: [] as PaymentAccount[] }
  );

  return { accounts, refetch };
}

export async function handleCreateAccount(input: Parameters<typeof createPaymentAccount>[0]) {
  const result = await createPaymentAccount(input);
  if (!result.ok) throw new Error(result.error.message);
  addPaymentAccount(result.data);
}

export async function handleUpdateAccount(
  id: string,
  input: Parameters<typeof updatePaymentAccount>[1]
) {
  const result = await updatePaymentAccount(id, input);
  if (!result.ok) throw new Error(result.error.message);
  updatePaymentAccountInState(id, result.data);
}

export async function handleDeleteAccount(id: string) {
  const result = await deletePaymentAccount(id);
  if (!result.ok) throw new Error(result.error.message);
  removePaymentAccountFromState(id);
}

export async function handleReorderAccounts(updates: { id: string; sort_order: number }[]) {
  const result = await reorderPaymentAccounts(updates);
  if (!result.ok) throw new Error(result.error.message);
  reorderPaymentAccountsInState(updates);
}

export function getPaymentAccount(id: string) {
  return getPaymentsState().accounts.find((a) => a.id === id);
}
