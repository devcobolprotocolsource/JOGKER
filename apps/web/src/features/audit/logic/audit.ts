import { createResource } from 'solid-js';
import { loadAuditLogs } from '../api/audit';
import { setAuditRows, setAuditLoading, setAuditError, auditState } from '../state/audit';

export function createAuditResource() {
  const [logs, { refetch }] = createResource(
    () => auditState.filter,
    async (filter) => {
      setAuditLoading(true);
      setAuditError(null);
      const result = await loadAuditLogs(filter);
      setAuditLoading(false);
      if (!result.ok) {
        setAuditError(result.error.message);
        return { rows: [], total: 0 };
      }
      setAuditRows(result.data.rows, result.data.total);
      return result.data;
    },
    { initialValue: { rows: [], total: 0 } }
  );

  return { logs, refetch };
}
