import { createRoot } from 'solid-js';
import { waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/audit', () => ({ loadAuditLogs: vi.fn() }));

import { loadAuditLogs } from '../api/audit';
import { auditState, setAuditError, setAuditFilter, setAuditRows } from '../state/audit';
import { createAuditResource } from './audit';

describe('createAuditResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuditError(null);
    setAuditRows([], 0);
    setAuditFilter({ page: 1, pageSize: 25, action: undefined });
  });

  it('loads audit rows into the resource and state', async () => {
    vi.mocked(loadAuditLogs).mockResolvedValue({ ok: true, data: { rows: [], total: 3 } });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createAuditResource();
    });

    await waitFor(() => expect(auditState.total).toBe(3));
    expect(auditState.error).toBeNull();
    expect(loadAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));
    dispose();
  });

  it('stores a load error and returns an empty result', async () => {
    vi.mocked(loadAuditLogs).mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Load failed' },
    });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createAuditResource();
    });

    await waitFor(() => expect(auditState.error).toBe('Load failed'));
    expect(auditState.total).toBe(0);
    dispose();
  });
});
