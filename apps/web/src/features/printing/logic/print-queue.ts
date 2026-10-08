import type { PaperWidth, ReceiptData } from '../../../shared/lib/receipt';

const QUEUE_STORAGE_KEY = 'printer.queue';

export interface QueuedReceipt {
  id: string;
  data: ReceiptData;
  paperWidth: PaperWidth;
  reprint: boolean;
  queuedAt: string;
}

export function getPrintQueue(): QueuedReceipt[] {
  const value = localStorage.getItem(QUEUE_STORAGE_KEY);
  return value ? (JSON.parse(value) as QueuedReceipt[]) : [];
}

export function enqueueReceipt(
  data: ReceiptData,
  paperWidth: PaperWidth,
  reprint = false
): QueuedReceipt {
  const queued: QueuedReceipt = {
    id: crypto.randomUUID(),
    data,
    paperWidth,
    reprint,
    queuedAt: new Date().toISOString(),
  };
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([...getPrintQueue(), queued]));
  return queued;
}

export function removeQueuedReceipt(id: string): void {
  localStorage.setItem(
    QUEUE_STORAGE_KEY,
    JSON.stringify(getPrintQueue().filter((receipt) => receipt.id !== id))
  );
}
