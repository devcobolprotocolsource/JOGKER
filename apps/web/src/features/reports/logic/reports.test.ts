import { createRoot } from 'solid-js';
import { waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/reports', () => ({
  loadSummaryReport: vi.fn(),
  loadDailyReport: vi.fn(),
  loadHourlyReport: vi.fn(),
  loadCategoryReport: vi.fn(),
  loadItemReport: vi.fn(),
  loadMethodReport: vi.fn(),
  loadVoucherReport: vi.fn(),
}));

import {
  loadCategoryReport,
  loadDailyReport,
  loadHourlyReport,
  loadItemReport,
  loadMethodReport,
  loadSummaryReport,
  loadVoucherReport,
} from '../api/reports';
import { getReportsState, setReportsDateRange } from '../state/reports';
import {
  createCategoryResource,
  createDailyResource,
  createHourlyResource,
  createItemResource,
  createMethodResource,
  createSummaryResource,
  createVoucherResource,
  refetchActiveReport,
} from './reports';

const summary = {
  totalSales: 100,
  totalTransactions: 2,
  avgTransaction: 50,
  totalDiscount: 0,
  totalService: 0,
  totalTax: 0,
  totalVoid: 0,
};

const failure = { ok: false as const, error: { code: 'UNKNOWN' as const, message: 'Load failed' } };

function createAllResources() {
  return [
    createSummaryResource(),
    createDailyResource(),
    createHourlyResource(),
    createCategoryResource(),
    createItemResource(),
    createMethodResource(),
    createVoucherResource(),
  ];
}

describe('report logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReportsDateRange({ startDate: '', endDate: '' });
  });

  it('does not query reports until both dates are selected', () => {
    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createAllResources();
    });

    expect(loadSummaryReport).not.toHaveBeenCalled();
    expect(loadDailyReport).not.toHaveBeenCalled();
    expect(loadHourlyReport).not.toHaveBeenCalled();
    expect(loadCategoryReport).not.toHaveBeenCalled();
    expect(loadItemReport).not.toHaveBeenCalled();
    expect(loadMethodReport).not.toHaveBeenCalled();
    expect(loadVoucherReport).not.toHaveBeenCalled();
    dispose();
  });

  it('loads all report resources and records the summary', async () => {
    setReportsDateRange({ startDate: '2024-01-01', endDate: '2024-01-31' });
    vi.mocked(loadSummaryReport).mockResolvedValue({ ok: true, data: summary });
    vi.mocked(loadDailyReport).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(loadHourlyReport).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(loadCategoryReport).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(loadItemReport).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(loadMethodReport).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(loadVoucherReport).mockResolvedValue({ ok: true, data: [] });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createAllResources();
    });

    await waitFor(() => {
      expect(loadSummaryReport).toHaveBeenCalledOnce();
      expect(loadDailyReport).toHaveBeenCalledOnce();
      expect(loadHourlyReport).toHaveBeenCalledOnce();
      expect(loadCategoryReport).toHaveBeenCalledOnce();
      expect(loadItemReport).toHaveBeenCalledOnce();
      expect(loadMethodReport).toHaveBeenCalledOnce();
      expect(loadVoucherReport).toHaveBeenCalledOnce();
    });
    expect(getReportsState().summary).toEqual(summary);
    dispose();
  });

  it('handles failed report requests and accepts every report tab', async () => {
    setReportsDateRange({ startDate: '2024-01-01', endDate: '2024-01-31' });
    vi.mocked(loadSummaryReport).mockResolvedValue(failure);
    vi.mocked(loadDailyReport).mockResolvedValue(failure);
    vi.mocked(loadHourlyReport).mockResolvedValue(failure);
    vi.mocked(loadCategoryReport).mockResolvedValue(failure);
    vi.mocked(loadItemReport).mockResolvedValue(failure);
    vi.mocked(loadMethodReport).mockResolvedValue(failure);
    vi.mocked(loadVoucherReport).mockResolvedValue(failure);

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createAllResources();
    });

    await waitFor(() => expect(loadVoucherReport).toHaveBeenCalledOnce());
    for (const tab of [
      'summary',
      'daily',
      'hourly',
      'category',
      'item',
      'method',
      'voucher',
    ] as const) {
      refetchActiveReport(tab);
    }
    expect(getReportsState().summary).toEqual(summary);
    dispose();
  });
});
