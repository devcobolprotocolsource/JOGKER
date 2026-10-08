import { For, Show, createSignal, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import { Download, Calendar } from 'lucide-solid';
import { Button, Card, DatePicker, Select, Tabs, Money, Badge, Toast } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { formatDateJakarta } from '../../../shared/lib/format';
import {
  createSummaryResource,
  createDailyResource,
  createHourlyResource,
  createCategoryResource,
  createItemResource,
  createMethodResource,
  createVoucherResource,
} from '../logic/reports';
import {
  getReportsState,
  setReportsDateRange,
  setActiveTab,
  csvExporting,
  setCsvExporting,
} from '../state/reports';
import { reportPresets, reportTabs } from '../schemas/report';
import type {
  SummaryReport,
  DailyReportItem,
  HourlyReportItem,
  CategoryReportItem,
  ItemReportItem,
  MethodReportItem,
  VoucherReportItem,
} from '../api/reports';

export function ReportsPage() {
  const summaryResource = createSummaryResource();
  const dailyResource = createDailyResource();
  const hourlyResource = createHourlyResource();
  const categoryResource = createCategoryResource();
  const itemResource = createItemResource();
  const methodResource = createMethodResource();
  const voucherResource = createVoucherResource();

  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const dateRange = getReportsState().dateRange;

  onMount(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    setReportsDateRange({ startDate: weekAgoStr ?? '', endDate: todayStr ?? '' });
  });

  function handleDateChange(value: string | [string, string]) {
    if (Array.isArray(value)) {
      setReportsDateRange({
        startDate: value[0] ?? '',
        endDate: value[1] ?? '',
      });
    }
  }

  function handlePresetChange(e: Event) {
    const preset = (e.target as HTMLSelectElement).value;
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0] ?? '';

    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'yesterday': {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        startDate = yesterday.toISOString().split('T')[0] ?? '';
        endDate = startDate;
        break;
      }
      case '7days': {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0] ?? '';
        break;
      }
      case '30days': {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString().split('T')[0] ?? '';
        break;
      }
      case 'thisMonth':
        startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'lastMonth': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split('T')[0] ?? '';
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate = lastMonthEnd.toISOString().split('T')[0] ?? '';
        break;
      }
      default:
        break;
    }
    setReportsDateRange({ startDate, endDate });
  }

  async function handleExportCSV(tab: string) {
    setCsvExporting(true);
    try {
      let data: (string | number)[][] = [];
      let headers: string[] = [];
      const filename = `laporan-${tab}-${new Date().toISOString().split('T')[0]}.csv`;

      switch (tab) {
        case 'summary': {
          const s = summaryResource();
          if (s) {
            headers = ['Metrik', 'Nilai'];
            data = [
              ['Total Penjualan', s.totalSales],
              ['Total Transaksi', s.totalTransactions],
              ['Rata-rata Transaksi', s.avgTransaction],
              ['Total Diskon', s.totalDiscount],
              ['Total Layanan', s.totalService],
              ['Total Pajak', s.totalTax],
              ['Total Void', s.totalVoid],
            ];
          }
          break;
        }
        case 'daily':
          headers = ['Tanggal', 'Total Penjualan', 'Total Transaksi', 'Rata-rata Transaksi'];
          data = dailyResource().map((d: DailyReportItem) => [
            formatDateJakarta(d.date),
            d.totalSales,
            d.totalTransactions,
            d.avgTransaction,
          ]);
          break;
        case 'hourly':
          headers = ['Jam', 'Total Penjualan', 'Total Transaksi'];
          data = hourlyResource().map((h: HourlyReportItem) => [
            h.hour,
            h.totalSales,
            h.totalTransactions,
          ]);
          break;
        case 'category':
          headers = ['Kategori', 'Total Penjualan', 'Total Kuantitas'];
          data = categoryResource().map((c: CategoryReportItem) => [
            c.category_name,
            c.totalSales,
            c.totalQty,
          ]);
          break;
        case 'item':
          headers = ['Item', 'Kategori', 'Kuantitas', 'Total Penjualan'];
          data = itemResource().map((i: ItemReportItem) => [
            i.item_name,
            i.category_name,
            i.totalQty,
            i.totalSales,
          ]);
          break;
        case 'method':
          headers = ['Metode', 'Total Penjualan', 'Total Transaksi'];
          data = methodResource().map((m: MethodReportItem) => [
            m.method,
            m.totalSales,
            m.totalTransactions,
          ]);
          break;
        case 'voucher':
          headers = ['Kode Voucher', 'Nama', 'Jumlah Pemakaian', 'Total Diskon'];
          data = voucherResource().map((v: VoucherReportItem) => [
            v.voucher_code,
            v.voucher_name,
            v.usageCount,
            v.totalDiscount,
          ]);
          break;
      }

      if (data.length === 0) {
        setToast({ type: 'error', message: 'Tidak ada data untuk diekspor' });
        return;
      }

      const csv = [
        headers.join(','),
        ...data.map((row) => row.map((v) => `"${v}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Laporan berhasil diekspor' });
    } catch {
      setToast({ type: 'error', message: 'Gagal mengekspor laporan' });
    } finally {
      setCsvExporting(false);
    }
  }

  const state = getReportsState();

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.reports.title}</h1>
          <p class="page-subtitle">{strings.reports.subtitle}</p>
        </div>
        <div class="page-actions">
          <DatePicker
            mode="range"
            label="Rentang tanggal"
            value={[dateRange.startDate, dateRange.endDate]}
            onChange={handleDateChange}
          />
          <Select
            label="Preset"
            options={reportPresets.map((p) => ({ value: p.value, label: p.label }))}
            value=""
            onChange={handlePresetChange}
            class="preset-select"
          />
          <Button
            variant="secondary"
            onClick={() => handleExportCSV(state.activeTab)}
            disabled={csvExporting()}
          >
            <Download size={18} aria-hidden="true" />
            {csvExporting() ? strings.reports.exporting : strings.reports.exportCSV}
          </Button>
        </div>
      </header>

      <Card class="reports-card">
        <div class="reports-tabs">
          <Tabs
            label="Jenis laporan"
            value={state.activeTab}
            onChange={setActiveTab}
            tabs={reportTabs.map((tab) => ({ value: tab.id, label: tab.label }))}
          />
        </div>

        <Show when={state.activeTab === 'summary'}>
          <ReportPanel
            loading={summaryResource.loading}
            data={summaryResource}
            render={(s) => (
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalSales}</span>
                  <Money value={s?.totalSales ?? 0} class="stat-value" />
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalTransactions}</span>
                  <span class="stat-value">
                    {(s?.totalTransactions ?? 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.avgTransaction}</span>
                  <Money value={s?.avgTransaction ?? 0} class="stat-value" />
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalDiscount}</span>
                  <Money value={s?.totalDiscount ?? 0} class="stat-value text-danger" />
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalService}</span>
                  <Money value={s?.totalService ?? 0} class="stat-value" />
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalTax}</span>
                  <Money value={s?.totalTax ?? 0} class="stat-value" />
                </div>
                <div class="stat-card">
                  <span class="stat-label">{strings.reports.totalVoid}</span>
                  <Money value={s?.totalVoid ?? 0} class="stat-value text-warning" />
                </div>
              </div>
            )}
          />
        </Show>

        <Show when={state.activeTab === 'daily'}>
          <ReportTable<DailyReportItem>
            loading={dailyResource.loading}
            rows={dailyResource}
            columns={[
              {
                key: 'date',
                header: strings.reports.colDate,
                render: (r: DailyReportItem) => formatDateJakarta(r.date),
              },
              {
                key: 'totalSales',
                header: strings.reports.colTotalSales,
                class: 'text-right',
                render: (r: DailyReportItem) => <Money value={r.totalSales} />,
              },
              {
                key: 'totalTransactions',
                header: strings.reports.colTransactions,
                class: 'text-center',
              },
              {
                key: 'avgTransaction',
                header: strings.reports.colAvgTransaction,
                class: 'text-right',
                render: (r: DailyReportItem) => <Money value={r.avgTransaction} />,
              },
            ]}
          />
        </Show>

        <Show when={state.activeTab === 'hourly'}>
          <ReportTable<HourlyReportItem>
            loading={hourlyResource.loading}
            rows={hourlyResource}
            columns={[
              {
                key: 'hour',
                header: strings.reports.colHour,
                class: 'text-center',
                render: (r: HourlyReportItem) => `${String(r.hour).padStart(2, '0')}:00`,
              },
              {
                key: 'totalSales',
                header: strings.reports.colTotalSales,
                class: 'text-right',
                render: (r: HourlyReportItem) => <Money value={r.totalSales} />,
              },
              {
                key: 'totalTransactions',
                header: strings.reports.colTransactions,
                class: 'text-center',
              },
            ]}
          />
        </Show>

        <Show when={state.activeTab === 'category'}>
          <ReportTable<CategoryReportItem>
            loading={categoryResource.loading}
            rows={categoryResource}
            columns={[
              { key: 'category_name', header: strings.reports.colCategory },
              {
                key: 'totalSales',
                header: strings.reports.colTotalSales,
                class: 'text-right',
                render: (r: CategoryReportItem) => <Money value={r.totalSales} />,
              },
              {
                key: 'totalQty',
                header: strings.reports.colQty,
                class: 'text-center tabular-nums',
              },
            ]}
          />
        </Show>

        <Show when={state.activeTab === 'item'}>
          <ReportTable<ItemReportItem>
            loading={itemResource.loading}
            rows={itemResource}
            columns={[
              { key: 'item_name', header: strings.reports.colItem },
              { key: 'category_name', header: strings.reports.colCategory },
              {
                key: 'totalQty',
                header: strings.reports.colQty,
                class: 'text-center tabular-nums',
              },
              {
                key: 'totalSales',
                header: strings.reports.colTotalSales,
                class: 'text-right',
                render: (r: ItemReportItem) => <Money value={r.totalSales} />,
              },
            ]}
          />
        </Show>

        <Show when={state.activeTab === 'method'}>
          <ReportTable<MethodReportItem>
            loading={methodResource.loading}
            rows={methodResource}
            columns={[
              {
                key: 'method',
                header: strings.reports.colMethod,
                render: (r: MethodReportItem) => (
                  <Badge
                    variant={
                      r.method === 'cash' ? 'success' : r.method === 'transfer' ? 'info' : 'neutral'
                    }
                  >
                    {r.method}
                  </Badge>
                ),
              },
              {
                key: 'totalSales',
                header: strings.reports.colTotalSales,
                class: 'text-right',
                render: (r: MethodReportItem) => <Money value={r.totalSales} />,
              },
              {
                key: 'totalTransactions',
                header: strings.reports.colTransactions,
                class: 'text-center',
              },
            ]}
          />
        </Show>

        <Show when={state.activeTab === 'voucher'}>
          <ReportTable<VoucherReportItem>
            loading={voucherResource.loading}
            rows={voucherResource}
            columns={[
              { key: 'voucher_code', header: strings.reports.colVoucherCode, class: 'font-mono' },
              { key: 'voucher_name', header: strings.reports.colVoucherName },
              {
                key: 'usageCount',
                header: strings.reports.colUsageCount,
                class: 'text-center tabular-nums',
              },
              {
                key: 'totalDiscount',
                header: strings.reports.colTotalDiscount,
                class: 'text-right',
                render: (r: VoucherReportItem) => <Money value={r.totalDiscount} />,
              },
            ]}
          />
        </Show>
      </Card>

      <Show when={toast()}>
        <Toast
          open={true}
          title={toast()!.type === 'success' ? 'Berhasil' : 'Error'}
          message={toast()!.message}
          variant={toast()!.type}
          onClose={() => setToast(null)}
        />
      </Show>
    </div>
  );
}

function ReportPanel(props: {
  loading: () => boolean;
  data: () => SummaryReport | null;
  render: (data: SummaryReport | null) => JSX.Element;
}) {
  if (props.loading()) {
    return (
      <div class="skeleton-grid">
        <For each={Array(7)}>{() => <div class="skeleton stat-card" />}</For>
      </div>
    );
  }
  return <>{props.render(props.data())}</>;
}

function ReportTable<T>(props: {
  loading: () => boolean;
  rows: () => T[];
  columns: {
    key: string;
    header: string;
    class?: string;
    render?: (row: T) => JSX.Element | string;
  }[];
}) {
  if (props.loading()) {
    return (
      <div class="skeleton-table">
        <For each={Array(5)}>{() => <div class="skeleton-row" />}</For>
      </div>
    );
  }

  const rowData = props.rows();
  if (rowData.length === 0) {
    return (
      <div class="empty-state">
        <Calendar size={48} aria-hidden="true" class="text-muted" />
        <h3>{strings.reports.emptyTitle}</h3>
        <p>{strings.reports.emptyDescription}</p>
      </div>
    );
  }

  return (
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <For each={props.columns}>
              {(col) => (
                <th scope="col" class={col.class}>
                  {col.header}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rowData}>
            {(row) => (
              <tr>
                <For each={props.columns}>
                  {(col) => (
                    <td class={col.class} data-label={col.header}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '-')}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
