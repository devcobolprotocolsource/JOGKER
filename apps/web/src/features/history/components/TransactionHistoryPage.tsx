import { For, Show, Switch, Match, createSignal, onMount, onCleanup } from 'solid-js';
import { Download, Filter, Search, X } from 'lucide-solid';
import {
  Button,
  Card,
  DataTable,
  DatePicker,
  Input,
  Money,
  Pagination,
  Select,
  StatusBadge,
  EmptyState,
  Skeleton,
  TextButton,
} from '../../../shared/ui';
import { formatDateJakarta } from '../../../shared/lib/format';
import { strings } from '../../../shared/strings';
import { createHistoryResource, exportCSV } from '../logic/history';
import {
  getHistoryState,
  setHistoryFilter,
  resetHistoryFilter,
  setSelectedOrderId,
  setDetailOpen,
  selectedOrderId,
  detailOpen,
} from '../state/history';
import {
  transactionStatusOptions,
  paymentMethodOptions,
  orderTypeOptions,
} from '../schemas/history';
import type { Status } from '../../../shared/ui/StatusBadge';

interface OrderDetail {
  order: {
    order_no: string;
    created_at: string;
    order_type: 'dine_in' | 'takeaway';
    status: string;
    table_label: string | null;
    customer_name: string | null;
    subtotal: number;
    discount_total: number;
    service_amount: number;
    tax_amount: number;
    rounding_amount: number;
    grand_total: number;
    profiles?: { full_name: string } | null;
  };
  items: Array<{
    id: string;
    item_name: string;
    qty: number;
    unit_price: number;
    modifiers: Array<{ name: string; extra_price: number }>;
    line_total: number;
    menu_items?: { name: string } | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    reference_no: string | null;
    status: string;
    payment_accounts?: { provider: string } | null;
  }>;
}

export function TransactionHistoryPage() {
  const { transactions, summary } = createHistoryResource();
  const [showFilters, setShowFilters] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaksi-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  }

  function handlePageChange(page: number) {
    setHistoryFilter({ page });
  }

  function handlePageSizeChange(pageSize: number) {
    setHistoryFilter({ page: 1, pageSize });
  }

  function handleSearch(value: string) {
    setHistoryFilter({ search: value, page: 1 });
  }

  function handleStatusChange(e: Event) {
    const status = (e.currentTarget as HTMLSelectElement).value;
    setHistoryFilter({ status: status || undefined, page: 1 });
  }

  function handleMethodChange(e: Event) {
    const method = (e.currentTarget as HTMLSelectElement).value;
    setHistoryFilter({ method: method || undefined, page: 1 });
  }

  function handleTypeChange(e: Event) {
    const type = (e.currentTarget as HTMLSelectElement).value;
    setHistoryFilter({ orderType: (type as 'dine_in' | 'takeaway') || undefined, page: 1 });
  }

  function handleDateChange(value: string | [string, string]) {
    if (Array.isArray(value)) {
      setHistoryFilter({
        startDate: value[0] || undefined,
        endDate: value[1] || undefined,
        page: 1,
      });
    } else {
      setHistoryFilter({ startDate: value || undefined, page: 1 });
    }
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.history.title}</h1>
          <p class="page-subtitle">{strings.history.subtitle}</p>
        </div>
        <div class="page-actions">
          <Button variant="secondary" onClick={handleExport} disabled={exporting()}>
            <Download size={18} aria-hidden="true" />
            {exporting() ? strings.history.exporting : 'Ekspor CSV'}
          </Button>
        </div>
      </header>

      <Card class="filter-card">
        <div class="filter-bar">
          <div class="filter-main">
            <div class="search-wrapper">
              <Input
                label={strings.history.searchPlaceholder}
                placeholder={strings.history.searchPlaceholder}
                value={getHistoryState().filter.search ?? ''}
                onInput={(e) => handleSearch(e.currentTarget.value)}
                icon={Search}
              />
            </div>
            <Select
              label={strings.history.filterStatus}
              options={transactionStatusOptions as unknown as { value: string; label: string }[]}
              value={getHistoryState().filter.status ?? ''}
              onChange={handleStatusChange}
            />
            <Select
              label={strings.history.filterMethod}
              options={paymentMethodOptions as unknown as { value: string; label: string }[]}
              value={getHistoryState().filter.method ?? ''}
              onChange={handleMethodChange}
            />
            <Select
              label={strings.history.filterType}
              options={orderTypeOptions as unknown as { value: string; label: string }[]}
              value={getHistoryState().filter.orderType ?? ''}
              onChange={handleTypeChange}
            />
          </div>
          <div class="filter-dates">
            <DatePicker
              mode="range"
              value={[
                getHistoryState().filter.startDate ?? '',
                getHistoryState().filter.endDate ?? '',
              ]}
              onChange={handleDateChange}
              label={strings.history.filterDate}
            />
          </div>
          <div class="filter-actions">
            <Button variant="ghost" onClick={resetHistoryFilter}>
              <X size={16} aria-hidden="true" />
              {strings.history.clearFilters}
            </Button>
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters())}>
              <Filter size={16} aria-hidden="true" />
              {showFilters() ? strings.history.hideFilters : strings.history.showFilters}
            </Button>
          </div>
        </div>

        <Show when={summary}>
          <div class="summary-bar">
            <div class="summary-item">
              <span class="summary-label">{strings.history.totalTransactions}</span>
              <span class="summary-value">{summary()?.totalTransactions ?? 0}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{strings.history.totalSales}</span>
              <Money value={summary()?.totalSales ?? 0} />
            </div>
            <div class="summary-item">
              <span class="summary-label">{strings.history.avgTransaction}</span>
              <Money value={summary()?.avgTransaction ?? 0} />
            </div>
          </div>
        </Show>
      </Card>

      <Card>
        <Show when={transactions.loading}>
          <div class="table-skeleton">
            <For each={Array(5)}>{() => <Skeleton class="skeleton-row" />}</For>
          </div>
        </Show>

        <Show when={!transactions.loading}>
          <Switch>
            <Match when={transactions().rows.length === 0}>
              <EmptyState
                icon={Search}
                title={strings.history.emptyTitle}
                description={strings.history.emptyDescription}
              />
            </Match>
            <Match when={true}>
              <DataTable
                caption={strings.history.title}
                rows={transactions().rows}
                rowKey={(row) => row.id}
                columns={[
                  {
                    key: 'order_no',
                    label: strings.history.colOrderNo,
                    value: (row) => row.order_no,
                    align: 'right',
                  },
                  {
                    key: 'created_at',
                    label: strings.history.colDate,
                    value: (row) => formatDateJakarta(row.created_at),
                  },
                  {
                    key: 'order_type',
                    label: strings.history.colType,
                    value: (row) =>
                      row.order_type === 'dine_in'
                        ? strings.history.typeDineIn
                        : strings.history.typeTakeaway,
                  },
                  {
                    key: 'items_summary',
                    label: strings.history.colItems,
                    value: (row) => row.items_summary,
                  },
                  {
                    key: 'method',
                    label: strings.history.colMethod,
                    value: (row) => row.method ?? '-',
                    render: (row) =>
                      row.method ? <StatusBadge status={row.method as Status} /> : '-',
                  },
                  {
                    key: 'grand_total',
                    label: strings.history.colTotal,
                    value: (row) => row.grand_total,
                    align: 'right',
                    render: (row) => <Money value={row.grand_total} />,
                  },
                  {
                    key: 'status',
                    label: strings.history.colStatus,
                    value: (row) => row.status,
                    render: (row) => <StatusBadge status={row.status as Status} />,
                  },
                  {
                    key: 'full_name',
                    label: strings.history.colCashier,
                    value: (row) => row.full_name ?? '-',
                  },
                  {
                    key: 'actions',
                    label: '',
                    value: () => '',
                    align: 'center',
                    render: (row) => (
                      <TextButton
                        onClick={() => {
                          setSelectedOrderId(row.id);
                          setDetailOpen(true);
                        }}
                      >
                        {'Lihat'}
                      </TextButton>
                    ),
                  },
                ]}
              />
            </Match>
          </Switch>

          <Show when={transactions().total > 0}>
            <Pagination
              page={getHistoryState().filter.page ?? 1}
              pageSize={getHistoryState().filter.pageSize ?? 25}
              total={transactions().total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizes={[25, 50, 100]}
            />
          </Show>
        </Show>
      </Card>

      <Show when={detailOpen() && selectedOrderId()}>
        <TransactionDetailDialog
          orderId={selectedOrderId()!}
          onClose={() => {
            setDetailOpen(false);
            setSelectedOrderId(null);
          }}
        />
      </Show>
    </div>
  );
}

function TransactionDetailDialog(props: { orderId: string; onClose: () => void }) {
  const [detail, setDetail] = createSignal<OrderDetail | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(() => {
    loadDetail();
  });

  async function loadDetail() {
    setLoading(true);
    try {
      const client = await import('../../../shared/api/supabase').then((m) =>
        m.getSupabaseClient()
      );
      const [orderResult, itemsResult, paymentsResult] = await Promise.all([
        client
          .from('orders')
          .select(
            `*, profiles!orders_created_by_fkey(full_name), vouchers!orders_voucher_id_fkey(code)`
          )
          .eq('id', props.orderId)
          .single(),
        client
          .from('order_items')
          .select(`*, menu_items!order_items_menu_item_id_fkey(name)`)
          .eq('order_id', props.orderId)
          .order('created_at'),
        client
          .from('payments')
          .select(
            `*, payment_accounts!payments_payment_account_id_fkey(provider, account_name, account_no)`
          )
          .eq('order_id', props.orderId)
          .order('created_at'),
      ]);
      setDetail({
        order: orderResult.data,
        items: itemsResult.data ?? [],
        payments: paymentsResult.data ?? [],
      });
    } catch (error) {
      console.error('Failed to load detail:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading()) {
    return (
      <div class="modal-overlay" onClick={props.onClose}>
        <div class="modal modal-lg" onClick={(e) => e.stopPropagation()}>
          <div class="modal-content">
            <div class="modal-header">
              <h2>{strings.history.detailTitle}</h2>
            </div>
            <div class="modal-body">
              <Skeleton class="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const detailData = detail();
  if (!detailData) {
    return (
      <div class="modal-overlay" onClick={props.onClose}>
        <div class="modal modal-lg" onClick={(e) => e.stopPropagation()}>
          <div class="modal-content">
            <div class="modal-header">
              <h2>{strings.history.detailTitle}</h2>
              <button class="icon-button" onClick={props.onClose} aria-label={strings.common.close}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div class="modal-body">
              <Skeleton class="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const order = detailData.order;
  const items = detailData.items;
  const payments = detailData.payments;

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div class="modal-content">
          <div class="modal-header">
            <h2>{strings.history.detailTitle}</h2>
            <button class="icon-button" onClick={props.onClose} aria-label={strings.common.close}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-section">
              <h3>{strings.history.orderInfo}</h3>
              <dl class="detail-grid">
                <dt>{strings.history.colOrderNo}</dt>
                <dd class="font-mono tabular-nums">{order.order_no}</dd>
                <dt>{strings.history.colDate}</dt>
                <dd>{formatDateJakarta(order.created_at)}</dd>
                <dt>{strings.history.colType}</dt>
                <dd>
                  {order.order_type === 'dine_in'
                    ? strings.history.typeDineIn
                    : strings.history.typeTakeaway}
                </dd>
                <dt>{strings.history.colStatus}</dt>
                <dd>
                  <StatusBadge status={order.status as Status} />
                </dd>
                <dt>{strings.history.colCashier}</dt>
                <dd>{order.profiles?.full_name ?? '-'}</dd>
              </dl>
            </div>

            <div class="detail-section">
              <h3>{strings.history.items}</h3>
              <DataTable
                caption={strings.history.items}
                rows={items}
                rowKey={(row) => row.id}
                columns={[
                  {
                    key: 'name',
                    label: strings.history.colItem,
                    value: (row) => row.menu_items?.name ?? row.item_name,
                  },
                  {
                    key: 'qty',
                    label: strings.history.colQty,
                    value: (row) => row.qty,
                    align: 'center',
                  },
                  {
                    key: 'unit_price',
                    label: strings.history.colUnitPrice,
                    value: (row) => row.unit_price,
                    align: 'right',
                    render: (row) => <Money value={row.unit_price} />,
                  },
                  {
                    key: 'modifiers',
                    label: strings.history.colModifiers,
                    value: (row) =>
                      (row.modifiers as Array<{ name: string; extra_price: number }>)
                        ?.map((m) => `${m.name} (+${m.extra_price})`)
                        .join(', ') ?? '-',
                  },
                  {
                    key: 'line_total',
                    label: strings.history.colLineTotal,
                    value: (row) => row.line_total,
                    align: 'right',
                    render: (row) => <Money value={row.line_total} />,
                  },
                ]}
              />
            </div>

            <div class="detail-section">
              <h3>{strings.history.payments}</h3>
              <DataTable
                caption={strings.history.payments}
                rows={payments}
                rowKey={(row) => row.id}
                columns={[
                  {
                    key: 'method',
                    label: strings.history.colMethod,
                    value: (row) => row.method,
                    render: (row) => <StatusBadge status={row.method as Status} />,
                  },
                  {
                    key: 'provider',
                    label: strings.history.colProvider,
                    value: (row) => row.payment_accounts?.provider ?? '-',
                  },
                  {
                    key: 'amount',
                    label: strings.history.colAmount,
                    value: (row) => row.amount,
                    align: 'right',
                    render: (row) => <Money value={row.amount} />,
                  },
                  {
                    key: 'reference_no',
                    label: strings.history.colRef,
                    value: (row) => row.reference_no ?? '-',
                  },
                  {
                    key: 'status',
                    label: strings.history.colStatus,
                    value: (row) => row.status,
                    render: (row) => <StatusBadge status={row.status as Status} />,
                  },
                ]}
              />
            </div>

            <div class="detail-totals">
              <dl class="totals-grid">
                <dt>{strings.history.subtotal}</dt>
                <dd class="text-right">
                  <Money value={order.subtotal} />
                </dd>
                <dt>{strings.history.discount}</dt>
                <dd class="text-right text-danger">
                  <Money value={order.discount_total} />
                </dd>
                <dt>{strings.history.service}</dt>
                <dd class="text-right">
                  <Money value={order.service_amount} />
                </dd>
                <dt>{strings.history.tax}</dt>
                <dd class="text-right">
                  <Money value={order.tax_amount} />
                </dd>
                <dt>{strings.history.rounding}</dt>
                <dd class="text-right">
                  <Money value={order.rounding_amount} />
                </dd>
                <dt class="font-bold">{strings.history.grandTotal}</dt>
                <dd class="text-right font-bold text-lg">
                  <Money value={order.grand_total} />
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
