import { createRoot } from 'solid-js';
import { waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/history', () => ({
  loadTransactions: vi.fn(),
  loadTransactionSummary: vi.fn(),
  exportTransactionsCSV: vi.fn(),
}));

import { exportTransactionsCSV, loadTransactionSummary, loadTransactions } from '../api/history';
import { historyState } from '../state/history';
import { createHistoryResource, exportCSV } from './history';

describe('history logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads transaction rows and summary into their resources and state', async () => {
    vi.mocked(loadTransactions).mockResolvedValue({ ok: true, data: { rows: [], total: 2 } });
    vi.mocked(loadTransactionSummary).mockResolvedValue({
      ok: true,
      data: { totalTransactions: 2, totalSales: 50000, avgTransaction: 25000 },
    });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createHistoryResource();
    });

    await waitFor(() => expect(historyState.summary?.totalSales).toBe(50000));
    expect(historyState.total).toBe(2);
    expect(historyState.error).toBeNull();
    dispose();
  });

  it('records row errors and returns a CSV export', async () => {
    vi.mocked(loadTransactions).mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Query failed' },
    });
    vi.mocked(loadTransactionSummary).mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Summary failed' },
    });
    vi.mocked(exportTransactionsCSV).mockResolvedValue({ ok: true, data: 'Nomor Pesanan\n' });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createHistoryResource();
    });

    await waitFor(() => expect(historyState.error).toBe('Query failed'));
    await expect(exportCSV()).resolves.toBe('Nomor Pesanan\n');
    dispose();
  });

  it('throws when CSV export fails', async () => {
    vi.mocked(exportTransactionsCSV).mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Export failed' },
    });

    await expect(exportCSV()).rejects.toThrow('Export failed');
  });
});
