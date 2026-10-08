import { beforeEach, describe, expect, it } from 'vitest';
import { enqueueReceipt, getPrintQueue, removeQueuedReceipt } from './print-queue';
import type { ReceiptData } from '../../../shared/lib/receipt';

const receipt: ReceiptData = {
  storeName: 'JOKGER',
  orderNo: 'JKG-20261008-0001',
  createdAt: '2026-10-08T10:00:00Z',
  lines: [],
  subtotal: 10000,
  discountTotal: 0,
  serviceAmount: 0,
  taxAmount: 0,
  roundingAmount: 0,
  grandTotal: 10000,
  payments: [{ method: 'Tunai', amount: 10000 }],
  change: 0,
};

describe('local receipt print queue', () => {
  beforeEach(() => localStorage.clear());

  it('persists receipts and removes a completed retry', () => {
    const first = enqueueReceipt(receipt, 58, true);
    const second = enqueueReceipt(receipt, 80);

    expect(getPrintQueue()).toEqual([first, second]);

    removeQueuedReceipt(first.id);
    expect(getPrintQueue()).toEqual([second]);
  });

  it('returns an empty queue when none have been stored', () => {
    expect(getPrintQueue()).toEqual([]);
  });
});
