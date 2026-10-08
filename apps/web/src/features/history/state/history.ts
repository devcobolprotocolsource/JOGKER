import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { TransactionFilter, TransactionRow, TransactionSummary } from '../api/history';
import { historyFilterSchema } from '../schemas/history';

interface HistoryState {
  filter: TransactionFilter;
  rows: TransactionRow[];
  total: number;
  summary: TransactionSummary | null;
  loading: boolean;
  loadingSummary: boolean;
  error: string | null;
}

const [historyState, setHistoryState] = createStore<HistoryState>({
  filter: {
    page: 1,
    pageSize: 25,
  },
  rows: [],
  total: 0,
  summary: null,
  loading: false,
  loadingSummary: false,
  error: null,
});

export { historyState };
export function getHistoryState() {
  return historyState;
}

export function setHistoryFilter(filter: Partial<TransactionFilter>) {
  const parsed = historyFilterSchema.safeParse({ ...historyState.filter, ...filter });
  if (parsed.success) {
    setHistoryState('filter', parsed.data);
  }
}

export function resetHistoryFilter() {
  setHistoryState('filter', { page: 1, pageSize: 25 });
}

export function setHistoryRows(rows: TransactionRow[], total: number) {
  setHistoryState('rows', rows);
  setHistoryState('total', total);
}

export function setHistorySummary(summary: TransactionSummary) {
  setHistoryState('summary', summary);
}

export function setHistoryLoading(loading: boolean) {
  setHistoryState('loading', loading);
}

export function setHistorySummaryLoading(loading: boolean) {
  setHistoryState('loadingSummary', loading);
}

export function setHistoryError(error: string | null) {
  setHistoryState('error', error);
}

export const [selectedOrderId, setSelectedOrderId] = createSignal<string | null>(null);
export const [detailOpen, setDetailOpen] = createSignal(false);
