import { createResource, onCleanup } from 'solid-js';
import { loadTransactions, loadTransactionSummary, exportTransactionsCSV } from './api/history';
import {
  setHistoryRows,
  setHistorySummary,
  setHistoryLoading,
  setHistorySummaryLoading,
  setHistoryError,
  historyState,
} from './state/history';

export function createHistoryResource() {
  const [transactions, { refetch: refetchTransactions }] = createResource(
    () => historyState.filter,
    async (filter) => {
      setHistoryLoading(true);
      setHistoryError(null);
      const result = await loadTransactions(filter);
      setHistoryLoading(false);
      if (!result.ok) {
        setHistoryError(result.error.message);
        return { rows: [], total: 0 };
      }
      setHistoryRows(result.data.rows, result.data.total);
      return result.data;
    },
    { initialValue: { rows: [], total: 0 } }
  );

  const [summary, { refetch: refetchSummary }] = createResource(
    () => historyState.filter,
    async (filter) => {
      setHistorySummaryLoading(true);
      const result = await loadTransactionSummary(filter);
      setHistorySummaryLoading(false);
      if (!result.ok) return null;
      setHistorySummary(result.data);
      return result.data;
    },
    { initialValue: null }
  );

  onCleanup(() => {
    transactions?.dispose?.();
    summary?.dispose?.();
  });

  return { transactions, refetchTransactions, summary, refetchSummary };
}

export async function exportCSV() {
  const result = await exportTransactionsCSV(historyState.filter);
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
