import { createSignal, For, onMount, Show } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { ArrowLeft, ExternalLink, ShieldCheck, Trash2 } from 'lucide-solid';
import { Button, Card, ConfirmDialog, Money, StatusBadge } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { canTransitionOrder, type OrderStatus } from '../../../shared/lib/order-status';
import { formatDateJakarta, formatTimeJakarta } from '../../../shared/lib/format';
import {
  cancelOrder,
  changeOrderStatus,
  createProofUrl,
  loadOrderDetail,
  verifyPayment,
  voidOrderItem,
  type OrderDetail,
} from '../api/orders';

export function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = createSignal<OrderDetail | null>(null);
  const [proofUrls, setProofUrls] = createSignal<Record<string, string>>({});
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const [cancelOpen, setCancelOpen] = createSignal(false);
  const [voidItemId, setVoidItemId] = createSignal('');
  const [rejectPaymentId, setRejectPaymentId] = createSignal('');

  async function refresh() {
    setLoading(true);
    const result = await loadOrderDetail(params.id);
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setOrder(result.data);
    const proofEntries = await Promise.all(
      result.data.payments
        .filter((payment) => payment.proof_path)
        .map(async (payment) => {
          const url = await createProofUrl(payment.proof_path!);
          return url.ok ? ([payment.id, url.data] as const) : null;
        })
    );
    setProofUrls(
      Object.fromEntries(
        proofEntries.filter((entry): entry is readonly [string, string] => entry !== null)
      )
    );
    setLoading(false);
  }
  onMount(() => void refresh());

  async function transition(status: OrderStatus) {
    if (!order() || !canTransitionOrder(order()!.status, status)) return;
    setBusy(true);
    const result = await changeOrderStatus(order()!.id, status);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function cancel(reason: string) {
    if (!order()) return;
    setBusy(true);
    const result = await cancelOrder(order()!.id, reason);
    setBusy(false);
    setCancelOpen(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function voidItem(reason: string) {
    const id = voidItemId();
    if (!id) return;
    setBusy(true);
    const result = await voidOrderItem(id, reason);
    setBusy(false);
    setVoidItemId('');
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function reviewPayment(paymentId: string, approve: boolean, note?: string) {
    setBusy(true);
    const result = await verifyPayment(paymentId, approve, note);
    setBusy(false);
    setRejectPaymentId('');
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  return (
    <main class="order-detail page-content">
      <A class="back-link" href="/orders">
        <ArrowLeft size={18} aria-hidden={true} />
        {strings.orders.title}
      </A>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.orders.loading}</p>}>
        <Show when={order()} fallback={<p>{strings.errors.ORDER_NOT_FOUND}</p>}>
          {(value) => (
            <>
              <header class="order-detail__header">
                <div>
                  <p class="page-eyebrow">{strings.orderDetail.title}</p>
                  <h1 class="order-number">{value().order_no}</h1>
                  <p>
                    {formatDateJakarta(value().created_at)} ·{' '}
                    {formatTimeJakarta(value().created_at)} ·{' '}
                    {value().table_label ??
                      value().customer_name ??
                      (value().order_type === 'dine_in'
                        ? strings.orders.dineIn
                        : strings.orders.takeaway)}
                  </p>
                </div>
                <StatusBadge status={value().status} />
              </header>
              <div class="order-detail__actions">
                <Show
                  when={
                    value().status === 'new' && canTransitionOrder(value().status, 'processing')
                  }
                >
                  <Button loading={busy()} onClick={() => void transition('processing')}>
                    {strings.orders.process}
                  </Button>
                </Show>
                <Show
                  when={
                    value().status === 'processing' && canTransitionOrder(value().status, 'ready')
                  }
                >
                  <Button loading={busy()} onClick={() => void transition('ready')}>
                    {strings.orders.markReady}
                  </Button>
                </Show>
                <Show
                  when={
                    value().status === 'ready' && canTransitionOrder(value().status, 'completed')
                  }
                >
                  <Button loading={busy()} onClick={() => void transition('completed')}>
                    {strings.orders.complete}
                  </Button>
                </Show>
                <Show when={value().status === 'new' || value().status === 'processing'}>
                  <Button variant="danger" disabled={busy()} onClick={() => setCancelOpen(true)}>
                    {strings.orders.cancel}
                  </Button>
                </Show>
                <Button variant="secondary" onClick={() => void refresh()}>
                  {strings.orders.refresh}
                </Button>
              </div>
              <div class="order-detail__grid">
                <Card class="order-detail__section">
                  <h2>{strings.orderDetail.items}</h2>
                  <Show
                    when={value().order_items.length > 0}
                    fallback={<p>{strings.orderDetail.noItems}</p>}
                  >
                    <For each={value().order_items}>
                      {(item) => (
                        <article
                          class={`order-detail-item ${item.is_voided ? 'order-detail-item--voided' : ''}`}
                        >
                          <div class="order-detail-item__top">
                            <strong>{item.item_name}</strong>
                            <span>
                              {item.qty} × <Money value={item.unit_price} />
                            </span>
                          </div>
                          <For each={item.modifiers}>
                            {(modifier) => (
                              <small>
                                {modifier.name} · <Money value={modifier.extra_price} />
                              </small>
                            )}
                          </For>
                          <Show when={item.note}>
                            <small>{item.note}</small>
                          </Show>
                          <Show when={item.is_voided}>
                            <small class="void-reason">
                              {strings.orderDetail.void}: {item.void_reason}
                            </small>
                          </Show>
                          <div class="order-detail-item__bottom">
                            <Money value={item.line_total} />
                            <Show
                              when={
                                !item.is_voided &&
                                value().status !== 'completed' &&
                                value().status !== 'cancelled'
                              }
                            >
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={busy()}
                                onClick={() => setVoidItemId(item.id)}
                              >
                                <Trash2 size={16} aria-hidden={true} />
                                {strings.orderDetail.void}
                              </Button>
                            </Show>
                          </div>
                        </article>
                      )}
                    </For>
                  </Show>
                  <div class="order-totals">
                    <div>
                      <span>{strings.orderDetail.subtotal}</span>
                      <Money value={value().subtotal} />
                    </div>
                    <Show when={value().discount_total > 0}>
                      <div>
                        <span>
                          {strings.orderDetail.discount} {value().voucher_code}
                        </span>
                        <Money value={-value().discount_total} />
                      </div>
                    </Show>
                    <Show when={value().service_amount > 0}>
                      <div>
                        <span>{strings.orderDetail.service}</span>
                        <Money value={value().service_amount} />
                      </div>
                    </Show>
                    <Show when={value().tax_amount > 0}>
                      <div>
                        <span>{strings.orderDetail.tax}</span>
                        <Money value={value().tax_amount} />
                      </div>
                    </Show>
                    <Show when={value().rounding_amount !== 0}>
                      <div>
                        <span>{strings.orderDetail.rounding}</span>
                        <Money value={value().rounding_amount} />
                      </div>
                    </Show>
                    <div class="cart-total">
                      <strong>{strings.orderDetail.total}</strong>
                      <Money value={value().grand_total} />
                    </div>
                  </div>
                </Card>
                <section class="order-detail__side">
                  <Card class="order-detail__section">
                    <h2>{strings.orderDetail.payments}</h2>
                    <Show
                      when={value().payments.length > 0}
                      fallback={<p>{strings.shift.noPayments}</p>}
                    >
                      <For each={value().payments}>
                        {(payment) => (
                          <article class="payment-detail-card">
                            <div class="payment-detail-card__head">
                              <StatusBadge status={payment.status} />
                              <Money value={payment.amount} />
                            </div>
                            <p>
                              {payment.method === 'cash'
                                ? strings.pos.cash
                                : (payment.payment_accounts?.provider ?? payment.method)}
                              {payment.reference_no && ` · ${payment.reference_no}`}
                            </p>
                            <Show
                              when={payment.proof_path}
                              fallback={<small>{strings.orderDetail.proofMissing}</small>}
                            >
                              <Show when={proofUrls()[payment.id]}>
                                <img
                                  class="payment-proof-thumb"
                                  src={proofUrls()[payment.id]}
                                  alt={strings.orderDetail.proof}
                                />
                                <a href={proofUrls()[payment.id]} target="_blank" rel="noreferrer">
                                  <ExternalLink size={16} aria-hidden={true} />
                                  {strings.orderDetail.openProof}
                                </a>
                              </Show>
                            </Show>
                            <Show when={payment.status === 'pending_verification'}>
                              <div class="payment-review-actions">
                                <Button
                                  loading={busy()}
                                  onClick={() =>
                                    void reviewPayment(payment.id, true, 'Pembayaran sesuai')
                                  }
                                >
                                  <ShieldCheck size={16} aria-hidden={true} />
                                  {strings.orderDetail.verify}
                                </Button>
                                <Button
                                  variant="danger"
                                  disabled={busy()}
                                  onClick={() => setRejectPaymentId(payment.id)}
                                >
                                  {strings.orderDetail.reject}
                                </Button>
                              </div>
                            </Show>
                            <Show when={payment.note}>
                              <small>{payment.note}</small>
                            </Show>
                          </article>
                        )}
                      </For>
                    </Show>
                  </Card>
                  <Card class="order-detail__section">
                    <h2>{strings.orderDetail.audit}</h2>
                    <Show
                      when={value().audit_logs.length > 0}
                      fallback={<p>{strings.orderDetail.noAudit}</p>}
                    >
                      <For each={value().audit_logs}>
                        {(entry) => (
                          <article class="audit-entry">
                            <strong>{entry.action}</strong>
                            <time>
                              {formatDateJakarta(entry.created_at)} ·{' '}
                              {formatTimeJakarta(entry.created_at)}
                            </time>
                            <Show when={entry.payload && typeof entry.payload === 'object'}>
                              <dl>
                                <For
                                  each={Object.entries(entry.payload as Record<string, unknown>)}
                                >
                                  {([key, item]) => (
                                    <div>
                                      <dt>{key}</dt>
                                      <dd>{String(item)}</dd>
                                    </div>
                                  )}
                                </For>
                              </dl>
                            </Show>
                          </article>
                        )}
                      </For>
                    </Show>
                  </Card>
                </section>
              </div>
            </>
          )}
        </Show>
      </Show>
      <ConfirmDialog
        open={cancelOpen()}
        title={strings.orders.cancelTitle}
        description={strings.orders.cancelDescription}
        destructive
        requireReason
        confirmLabel={strings.orders.cancelConfirm}
        cancelLabel={strings.common.cancel}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => void cancel(reason)}
      />
      <ConfirmDialog
        open={Boolean(voidItemId())}
        title={strings.orderDetail.voidTitle}
        description={strings.orderDetail.voidDescription}
        destructive
        requireReason
        confirmLabel={strings.orderDetail.void}
        cancelLabel={strings.common.cancel}
        onClose={() => setVoidItemId('')}
        onConfirm={(reason) => void voidItem(reason)}
      />
      <ConfirmDialog
        open={Boolean(rejectPaymentId())}
        title={strings.orderDetail.rejectTitle}
        description={strings.orderDetail.rejectDescription}
        destructive
        requireReason
        confirmLabel={strings.orderDetail.reject}
        cancelLabel={strings.common.cancel}
        onClose={() => setRejectPaymentId('')}
        onConfirm={(reason) => void reviewPayment(rejectPaymentId(), false, reason)}
      />
    </main>
  );
}
