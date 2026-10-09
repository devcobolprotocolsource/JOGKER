import { createMemo, createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Clock3, RefreshCw } from 'lucide-solid';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Money,
  SearchInput,
  StatusBadge,
  Tabs,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { useRealtime } from '../../../shared/hooks';
import { canTransitionOrder } from '../../../shared/lib/order-status';
import type { OrderStatus } from '../../../shared/lib/order-status';
import { cancelOrder, changeOrderStatus, loadOrders, type OrderSummary } from '../api/orders';
import { X } from 'lucide-solid';

type Filter = 'all' | OrderStatus | 'open';
const statusTabs: { value: Filter; label: string }[] = [
  { value: 'all', label: strings.orders.all },
  { value: 'new', label: strings.orders.new },
  { value: 'processing', label: strings.orders.processing },
  { value: 'ready', label: strings.orders.ready },
  { value: 'cancelled', label: strings.orders.cancelled },
  { value: 'completed', label: strings.orders.completed },
  { value: 'open', label: strings.orders.openBills },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = createSignal<OrderSummary[]>([]);
  const [filter, setFilter] = createSignal<Filter>('all');
  const [query, setQuery] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [cancelTarget, setCancelTarget] = createSignal<OrderSummary | null>(null);
  const [busyOrderId, setBusyOrderId] = createSignal('');
  const [compact, setCompact] = createSignal(false);
  let media: MediaQueryList | undefined;
  const updateViewport = () => setCompact(media?.matches ?? false);
  const tabs = createMemo(() =>
    statusTabs.map((tab) => ({
      ...tab,
      count:
        tab.value === 'all'
          ? orders().length
          : tab.value === 'open'
            ? orders().filter((order) => order.bill_state === 'open').length
            : orders().filter((order) => order.status === tab.value).length,
    }))
  );
  const visibleOrders = createMemo(() => {
    const search = query().trim().toLocaleLowerCase('id-ID');
    return orders().filter((order) => {
      const matchesFilter =
        filter() === 'all' ||
        (filter() === 'open' ? order.bill_state === 'open' : order.status === filter());
      const matchesSearch =
        !search ||
        order.order_no.toLocaleLowerCase('id-ID').includes(search) ||
        order.table_label?.toLocaleLowerCase('id-ID').includes(search) ||
        order.customer_name?.toLocaleLowerCase('id-ID').includes(search);
      return matchesFilter && matchesSearch;
    });
  });

  async function refresh() {
    setLoading(true);
    const result = await loadOrders();
    if (result.ok) {
      setOrders(result.data);
      setError('');
    } else setError(result.error.message);
    setLoading(false);
  }
  useRealtime({ table: 'orders', onChange: () => void refresh() });

  onMount(() => {
    if (typeof window.matchMedia === 'function') {
      media = window.matchMedia('(max-width: 1023px)');
      updateViewport();
      media.addEventListener('change', updateViewport);
    }
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    onCleanup(() => {
      window.removeEventListener('focus', onFocus);
      media?.removeEventListener('change', updateViewport);
    });
  });

  async function transition(order: OrderSummary, next: OrderStatus) {
    if (!canTransitionOrder(order.status, next)) return;
    setBusyOrderId(order.id);
    const result = await changeOrderStatus(order.id, next);
    setBusyOrderId('');
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function cancel(reason: string) {
    const order = cancelTarget();
    if (!order || !reason.trim()) return;
    setBusyOrderId(order.id);
    const result = await cancelOrder(order.id, reason);
    setBusyOrderId('');
    setCancelTarget(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  return (
    <main class="orders-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">{strings.shell.pos}</p>
          <h1>{strings.orders.title}</h1>
        </div>
        <Button variant="secondary" onClick={() => void refresh()}>
          <RefreshCw size={18} aria-hidden={true} />
          {strings.orders.refresh}
        </Button>
      </header>
      <div class="orders-toolbar">
        <Tabs
          label={strings.orders.title}
          value={filter()}
          tabs={tabs()}
          onChange={(value) => setFilter(value as Filter)}
        />
        <SearchInput
          label={strings.pos.searchMenu}
          placeholder={strings.orders.title}
          onSearch={setQuery}
        />
      </div>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.orders.loading}</p>}>
        <Show
          when={visibleOrders().length > 0}
          fallback={
            <EmptyState icon={X} title={strings.orders.empty} description={strings.orders.empty} />
          }
        >
          <div class="orders-board">
            <Show when={filter() === 'all' && !compact()}>
              <For each={['new', 'processing', 'ready'] as OrderStatus[]}>
                {(status) => (
                  <section
                    class="orders-column"
                    aria-label={statusTabs.find((tab) => tab.value === status)?.label}
                  >
                    <h2>
                      {statusTabs.find((tab) => tab.value === status)?.label}
                      <span>
                        {visibleOrders().filter((order) => order.status === status).length}
                      </span>
                    </h2>
                    <For each={visibleOrders().filter((order) => order.status === status)}>
                      {(order) => (
                        <OrderCard
                          order={order}
                          busy={busyOrderId() === order.id}
                          onOpen={() => navigate(`/orders/${order.id}`)}
                          onTransition={(next) => void transition(order, next)}
                          onCancel={() => setCancelTarget(order)}
                        />
                      )}
                    </For>
                  </section>
                )}
              </For>
            </Show>
            <Show when={filter() !== 'all'}>
              <section class="orders-list">
                <For each={visibleOrders()}>
                  {(order) => (
                    <OrderCard
                      order={order}
                      busy={busyOrderId() === order.id}
                      onOpen={() =>
                        order.bill_state === 'open'
                          ? navigate(`/pos/open-bill/${order.id}`)
                          : navigate(`/orders/${order.id}`)
                      }
                      onTransition={(next) => void transition(order, next)}
                      onCancel={() => setCancelTarget(order)}
                    />
                  )}
                </For>
              </section>
            </Show>
          </div>
        </Show>
      </Show>
      <ConfirmDialog
        open={Boolean(cancelTarget())}
        title={strings.orders.cancelTitle}
        description={strings.orders.cancelDescription}
        destructive
        requireReason
        confirmLabel={strings.orders.cancelConfirm}
        cancelLabel={strings.common.cancel}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => void cancel(reason)}
      />
    </main>
  );
}

function OrderCard(props: {
  order: OrderSummary;
  busy: boolean;
  onOpen: () => void;
  onTransition: (status: OrderStatus) => void;
  onCancel: () => void;
}) {
  const [now, setNow] = createSignal(Date.now());
  let timer: number | undefined;
  onMount(() => {
    timer = window.setInterval(() => setNow(Date.now()), 60000);
  });
  onCleanup(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });
  const elapsedMinutes = () =>
    Math.max(0, Math.floor((now() - new Date(props.order.created_at).getTime()) / 60000));
  const overdue = () => props.order.status === 'new' && elapsedMinutes() > 15;
  return (
    <Card class={`order-card ${overdue() ? 'order-card--overdue' : ''}`}>
      <button class="order-card__open" type="button" onClick={() => props.onOpen()}>
        <span class="order-card__number">{props.order.order_no}</span>
        <StatusBadge status={props.order.status} />
      </button>
      <div class="order-card__meta">
        <span>
          {props.order.table_label ??
            props.order.customer_name ??
            (props.order.order_type === 'dine_in'
              ? strings.orders.dineIn
              : strings.orders.takeaway)}
        </span>
        <span>{strings.orders.itemCount.replace('{count}', String(props.order.item_count))}</span>
        <span>
          <Clock3 size={15} aria-hidden={true} />
          {strings.orders.minutes.replace('{count}', String(elapsedMinutes()))}
        </span>
      </div>
      <div class="order-card__total">
        <Money value={props.order.grand_total} />
        <Show when={overdue()}>
          <strong>{strings.orders.overdue}</strong>
        </Show>
      </div>
      <div class="order-card__actions">
        <Show
          when={
            props.order.status === 'new' && canTransitionOrder(props.order.status, 'processing')
          }
        >
          <Button size="sm" loading={props.busy} onClick={() => props.onTransition('processing')}>
            {strings.orders.process}
          </Button>
        </Show>
        <Show
          when={
            props.order.status === 'processing' && canTransitionOrder(props.order.status, 'ready')
          }
        >
          <Button size="sm" loading={props.busy} onClick={() => props.onTransition('ready')}>
            {strings.orders.markReady}
          </Button>
        </Show>
        <Show
          when={
            props.order.status === 'ready' && canTransitionOrder(props.order.status, 'completed')
          }
        >
          <Button size="sm" loading={props.busy} onClick={() => props.onTransition('completed')}>
            {strings.orders.complete}
          </Button>
        </Show>
        <Show when={props.order.status === 'new' || props.order.status === 'processing'}>
          <Button variant="danger" size="sm" disabled={props.busy} onClick={props.onCancel}>
            {strings.orders.cancel}
          </Button>
        </Show>
      </div>
    </Card>
  );
}
