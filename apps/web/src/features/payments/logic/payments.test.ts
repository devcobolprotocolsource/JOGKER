import { createRoot } from 'solid-js';
import { waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/payments', () => ({
  loadPaymentAccounts: vi.fn(),
  createPaymentAccount: vi.fn(),
  updatePaymentAccount: vi.fn(),
  deletePaymentAccount: vi.fn(),
  reorderPaymentAccounts: vi.fn(),
}));

import {
  createPaymentAccount,
  deletePaymentAccount,
  loadPaymentAccounts,
  reorderPaymentAccounts,
  updatePaymentAccount,
} from '../api/payments';
import { getPaymentsState, setPaymentAccounts } from '../state/payments';
import {
  createPaymentAccountsResource,
  getPaymentAccount,
  handleCreateAccount,
  handleDeleteAccount,
  handleReorderAccounts,
  handleUpdateAccount,
} from './payments';

const account = {
  id: 'account-1',
  method: 'transfer' as const,
  provider: 'Bank',
  account_name: 'Cafe',
  account_no: '123',
  is_active: true,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('payment account logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPaymentAccounts([]);
  });

  it('loads accounts and records load failures', async () => {
    vi.mocked(loadPaymentAccounts).mockResolvedValue({ ok: true, data: [account] });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createPaymentAccountsResource();
    });

    await waitFor(() => expect(getPaymentsState().accounts).toEqual([account]));
    expect(getPaymentsState().error).toBeNull();
    dispose();

    vi.mocked(loadPaymentAccounts).mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Accounts failed' },
    });
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createPaymentAccountsResource();
    });

    await waitFor(() => expect(getPaymentsState().error).toBe('Accounts failed'));
    dispose();
  });

  it('creates, updates, reorders, deletes, and looks up accounts', async () => {
    vi.mocked(createPaymentAccount).mockResolvedValue({ ok: true, data: account });
    vi.mocked(updatePaymentAccount).mockResolvedValue({
      ok: true,
      data: { ...account, provider: 'Updated Bank' },
    });
    vi.mocked(reorderPaymentAccounts).mockResolvedValue({ ok: true, data: undefined });
    vi.mocked(deletePaymentAccount).mockResolvedValue({
      ok: true,
      data: { ...account, is_active: false },
    });

    await handleCreateAccount({
      method: 'transfer',
      provider: 'Bank',
      account_name: 'Cafe',
      account_no: '123',
      is_active: true,
      sort_order: 0,
    });
    expect(getPaymentAccount('account-1')).toEqual(account);

    await handleUpdateAccount('account-1', { provider: 'Updated Bank' });
    expect(getPaymentAccount('account-1')?.provider).toBe('Updated Bank');

    await handleReorderAccounts([{ id: 'account-1', sort_order: 4 }]);
    expect(getPaymentAccount('account-1')?.sort_order).toBe(4);

    await handleDeleteAccount('account-1');
    expect(getPaymentAccount('account-1')?.is_active).toBe(false);
  });
});
