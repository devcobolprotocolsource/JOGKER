import { For, Show, Switch, Match, createSignal } from 'solid-js';
import { Search, Filter, X, Download, Eye, FileText } from 'lucide-solid';
import {
  Button,
  Card,
  Input,
  Select,
  DatePicker,
  Pagination,
  Badge,
  IconButton,
  Skeleton,
  EmptyState,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { formatDateJakarta } from '../../../shared/lib/format';
import { createAuditResource } from '../logic/audit';
import {
  getAuditState,
  setAuditFilter,
  setSelectedLogId,
  setDetailOpen,
  selectedLogId,
  detailOpen,
} from '../state/audit';
import { loadAuditLogs } from '../api/audit';
import type { AuditLogEntry } from '../schemas/audit';

export function AuditLogPage() {
  const { logs, refetch } = createAuditResource();
  const [showFilters, setShowFilters] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function handlePageChange(page: number) {
    setAuditFilter({ page });
  }

  function handlePageSizeChange(pageSize: number) {
    setAuditFilter({ page: 1, pageSize });
  }

  function handleSearch(value: string) {
    setAuditFilter({ action: value || undefined, page: 1 });
  }

  function handleEntityChange(entity: string) {
    setAuditFilter({ entity: entity || undefined, page: 1 });
  }

  function handleDateChange(value: string | [string, string]) {
    if (Array.isArray(value)) {
      setAuditFilter({
        startDate: value[0] || undefined,
        endDate: value[1] || undefined,
        page: 1,
      });
    } else {
      setAuditFilter({ startDate: value || undefined, page: 1 });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const filter = getAuditState().filter;
      const result = await loadAuditLogs({ ...filter, page: 1, pageSize: 10000 });
      if (!result.ok) throw new Error(result.error.message);

      const headers = ['ID', 'Waktu', 'Aktor', 'Aksi', 'Entitas', 'ID Entitas', 'Detail'];
      const lines = [headers.join(',')];

      for (const row of result.data.rows) {
        lines.push(
          [
            row.id.toString(),
            new Date(row.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
            row.profiles?.full_name ?? 'Sistem',
            row.action,
            row.entity,
            row.entity_id ?? '-',
            JSON.stringify(row.payload ?? {}).replace(/"/g, '""'),
          ]
            .map((v) => `"${v}"`)
            .join(',')
        );
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', strings.audit.exported);
    } catch {
      showToast('error', strings.audit.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  function openDetail(log: AuditLogEntry) {
    setSelectedLogId(log.id);
    setDetailOpen(true);
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.audit.title}</h1>
          <p class="page-subtitle">{strings.audit.subtitle}</p>
        </div>
        <div class="page-actions">
          <Button variant="secondary" onClick={handleExport} disabled={exporting()}>
            <Download size={18} aria-hidden="true" />
            {exporting() ? strings.audit.exporting : strings.audit.exportCSV}
          </Button>
        </div>
      </header>

      <Card class="filter-card">
        <div class="filter-bar">
          <div class="filter-main">
            <div class="search-wrapper">
              <Input
                label={strings.audit.searchPlaceholder}
                placeholder={strings.audit.searchPlaceholder}
                value={getAuditState().filter.action ?? ''}
                onInput={(e) => handleSearch(e.currentTarget.value)}
                icon={Search}
              />
            </div>
            <Select
              label={strings.audit.filterEntity}
              options={[
                { value: '', label: strings.audit.allEntities },
                { value: 'orders', label: 'Pesanan' },
                { value: 'payments', label: 'Pembayaran' },
                { value: 'vouchers', label: 'Voucher' },
                { value: 'inventory_items', label: 'Inventaris' },
                { value: 'stock_movements', label: 'Pergerakan Stok' },
                { value: 'stock_opnames', label: 'Stok Opname' },
                { value: 'shifts', label: 'Shift' },
                { value: 'profiles', label: 'Staff' },
                { value: 'store_settings', label: 'Pengaturan' },
              ]}
              value={getAuditState().filter.entity ?? ''}
              onChange={(e) => handleEntityChange(e.currentTarget.value)}
            />
            <DatePicker
              mode="range"
              value={[getAuditState().filter.startDate ?? '', getAuditState().filter.endDate ?? '']}
              onChange={handleDateChange}
              label={strings.audit.filterDate}
            />
          </div>
          <div class="filter-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setAuditFilter({
                  action: undefined,
                  entity: undefined,
                  startDate: undefined,
                  endDate: undefined,
                  page: 1,
                });
                refetch();
              }}
            >
              <X size={16} aria-hidden="true" />
              {strings.audit.clearFilters}
            </Button>
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters())}>
              <Filter size={16} aria-hidden="true" />
              {showFilters() ? strings.audit.hideFilters : strings.audit.showFilters}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <Show when={getAuditState().loading}>
          <div class="table-skeleton">
            <For each={Array(5)}>{() => <Skeleton class="skeleton-row" />}</For>
          </div>
        </Show>

        <Show when={!getAuditState().loading}>
          <Switch>
            <Match when={logs().rows.length === 0}>
              <EmptyState
                icon={FileText}
                title={strings.audit.emptyTitle}
                description={strings.audit.emptyDescription}
              />
            </Match>
            <Match when={true}>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col" class="w-12">
                        #
                      </th>
                      <th scope="col">{strings.audit.colTime}</th>
                      <th scope="col">{strings.audit.colActor}</th>
                      <th scope="col">{strings.audit.colAction}</th>
                      <th scope="col">{strings.audit.colEntity}</th>
                      <th scope="col">{strings.audit.colEntityId}</th>
                      <th scope="col" class="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    <For each={logs().rows}>
                      {(log) => (
                        <tr onClick={() => openDetail(log)} class="clickable-row">
                          <td class="font-mono tabular-nums">{log.id}</td>
                          <td class="text-nowrap">{formatDateJakarta(log.created_at)}</td>
                          <td>{log.profiles?.full_name ?? strings.audit.system}</td>
                          <td>
                            <Badge variant="neutral">{log.action}</Badge>
                          </td>
                          <td>{log.entity}</td>
                          <td class="font-mono">{log.entity_id ?? '-'}</td>
                          <td>
                            <IconButton
                              label="Lihat detail"
                              icon={Eye}
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(log);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Match>
          </Switch>

          <Show when={logs().total > 0}>
            <Pagination
              page={getAuditState().filter.page ?? 1}
              pageSize={getAuditState().filter.pageSize ?? 25}
              total={logs().total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizes={[25, 50, 100]}
            />
          </Show>
        </Show>
      </Card>

      <Show when={detailOpen() && selectedLogId()}>
        <AuditDetailDialog
          log={logs().rows.find((l) => l.id === selectedLogId())!}
          onClose={() => {
            setDetailOpen(false);
            setSelectedLogId(null);
          }}
        />
      </Show>

      <Show when={toast()}>
        <div class="toast toast--{toast()!.type}" role="alert">
          {toast()!.message}
        </div>
      </Show>
    </div>
  );
}

function AuditDetailDialog(props: {
  log: {
    id: number;
    actor_id: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
    profiles: { full_name: string } | null;
  };
  onClose: () => void;
}) {
  const log = props.log;
  const onClose = () => props.onClose();

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div class="modal-content">
          <div class="modal-header">
            <h2>{strings.audit.detailTitle}</h2>
            <button class="icon-button" onClick={onClose} aria-label={strings.common.close}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-section">
              <h3>{strings.audit.detailInfo}</h3>
              <dl class="detail-grid">
                <dt>{strings.audit.colId}</dt>
                <dd class="font-mono tabular-nums">{log.id}</dd>
                <dt>{strings.audit.colTime}</dt>
                <dd>
                  {new Date(log.created_at).toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </dd>
                <dt>{strings.audit.colActor}</dt>
                <dd>{log.profiles?.full_name ?? strings.audit.system}</dd>
                <dt>{strings.audit.colAction}</dt>
                <dd>
                  <Badge variant="neutral">{log.action}</Badge>
                </dd>
                <dt>{strings.audit.colEntity}</dt>
                <dd>{log.entity}</dd>
                <dt>{strings.audit.colEntityId}</dt>
                <dd class="font-mono">{log.entity_id ?? '-'}</dd>
              </dl>
            </div>

            <Show when={log.payload && Object.keys(log.payload).length > 0}>
              <div class="detail-section">
                <h3>{strings.audit.payload}</h3>
                <pre class="payload-view">{JSON.stringify(log.payload, null, 2)}</pre>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
