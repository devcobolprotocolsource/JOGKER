import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { PaymentAccount } from '../api/payments';

interface PaymentsState {
  accounts: PaymentAccount[];
  loading: boolean;
  error: string | null;
}

const [paymentsState, setPaymentsState] = createStore<PaymentsState>({
  accounts: [],
  loading: false,
  error: null,
});

export function getPaymentsState() {
  return paymentsState;
}

export function setPaymentAccounts(accounts: PaymentAccount[]) {
  setPaymentsState('accounts', accounts);
}

export function setPaymentsLoading(loading: boolean) {
  setPaymentsState('loading', loading);
}

export function setPaymentsError(error: string | null) {
  setPaymentsState('error', error);
}

export function addPaymentAccount(account: PaymentAccount) {
  setPaymentsState('accounts', [...paymentsState.accounts, account]);
}

export function updatePaymentAccountInState(id: string, updates: Partial<PaymentAccount>) {
  setPaymentsState('accounts', (accounts) =>
    accounts.map((a) => (a.id === id ? { ...a, ...updates } : a))
  );
}

export function removePaymentAccountFromState(id: string) {
  setPaymentsState('accounts', (accounts) => accounts.filter((a) => a.id !== id));
}

export function reorderPaymentAccountsInState(updates: { id: string; sort_order: number }[]) {
  setPaymentsState('accounts', (accounts) =>
    accounts.map((a) => {
      const update = updates.find((u) => u.id === a.id);
      return update ? { ...a, sort_order: update.sort_order } : a;
    })
  );
}

export const [selectedAccountId, setSelectedAccountId] = createSignal<string | null>(null);
export const [accountDialogOpen, setAccountDialogOpen] = createSignal(false);
export const [accountDialogMode, setAccountDialogMode] = createSignal<'create' | 'edit'>('create');
