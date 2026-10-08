import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { AuditLogFilter, AuditLogEntry } from '../schemas/audit';

interface AuditState {
  filter: AuditLogFilter;
  rows: AuditLogEntry[];
  total: number;
  loading: boolean;
  error: string | null;
}

const [auditState, setAuditState] = createStore<AuditState>({
  filter: { page: 1, pageSize: 25 },
  rows: [],
  total: 0,
  loading: false,
  error: null,
});

export { auditState };

export function getAuditState() {
  return auditState;
}

export function setAuditFilter(filter: Partial<AuditLogFilter>) {
  setAuditState('filter', { ...auditState.filter, ...filter });
}

export function setAuditRows(rows: AuditLogEntry[], total: number) {
  setAuditState('rows', rows);
  setAuditState('total', total);
}

export function setAuditLoading(loading: boolean) {
  setAuditState('loading', loading);
}

export function setAuditError(error: string | null) {
  setAuditState('error', error);
}

export const [selectedLogId, setSelectedLogId] = createSignal<number | null>(null);
export const [detailOpen, setDetailOpen] = createSignal(false);
