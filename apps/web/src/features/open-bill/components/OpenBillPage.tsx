import { createMemo, createSignal, onMount, For, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { ArrowLeft, Check } from 'lucide-solid';
import { Banner, Button, Card, Money, SearchInput, StatusBadge } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { online } from '../../../shared/stores/connection';
import { refreshSettings, settingsState } from '../../../shared/stores/settings';
import { refreshShift } from '../../../shared/stores/shift';
import {
  cartState,
  addItem,
  changeQuantity,
  clearCart,
  clearVoucher,
  removeItem,
  type MenuItem,
} from '../../pos/state/cart';
import { cartTotals } from '../../pos/logic/cart';
import {
  addItemsToOpenBill,
  applyVoucherToOrder,
  closeOpenBill,
  loadCatalog,
  loadPaymentAccounts,
  type PaymentAccount,
  type PaymentLine,
  type Category,
} from '../../pos/api/pos';
import { loadOrderDetail as loadDetail } from '../../orders/api/orders';
import { ModifierDialog } from '../../pos/components/ModifierDialog';
import { CatalogGrid } from '../../pos/components/CatalogGrid';
import { CartPanel } from '../../pos/components/CartPanel';
import { PaymentDialog } from '../../pos/components/PaymentDialog';
import type { OrderDetail } from '../../orders/api/orders';
import { openBillVoucherSchema } from '../schemas/open-bill';

export function OpenBillPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = createSignal<OrderDetail | null>(null);
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [menu, setMenu] = createSignal<MenuItem[]>([]);
  const [accounts, setAccounts] = createSignal<PaymentAccount[]>([]);
  const [category, setCategory] = createSignal('');
  const [search, setSearch] = createSignal('');
  const [modifier, setModifier] = createSignal<MenuItem | null>(null);
  const [voucherCode, setVoucherCode] = createSignal('');
  const [voucherError, setVoucherError] = createSignal('');
  const [error, setError] = createSignal('');
  const [notice, setNotice] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [paymentOpen, setPaymentOpen] = createSignal(false);

  const visibleItems = createMemo(() => {
    const query = search().trim().toLocaleLowerCase('id-ID');
    return menu().filter(
      (item) =>
        (!category() || item.category_id === category()) &&
        (!query || item.name.toLocaleLowerCase('id-ID').includes(query))
    );
  });
  const draftTotals = createMemo(() =>
    cartTotals(cartState.items, {
      servicePercent: settingsState.value?.service_percent ?? 0,
      taxPercent: settingsState.value?.tax_percent ?? 0,
      roundingRule: settingsState.value?.rounding_rule ?? 'none',
    })
  );

  async function refresh() {
    const result = await loadDetail(params.id);
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setOrder(result.data);
    setLoading(false);
  }

  onMount(() => {
    void refreshShift();
    void refreshSettings();
    void refresh();
    void Promise.all([loadCatalog(), loadPaymentAccounts()]).then(([catalog, paymentAccounts]) => {
      if (catalog.ok) {
        setCategories(catalog.data.categories);
        setMenu(catalog.data.items);
      } else setError(catalog.error.message);
      if (paymentAccounts.ok) setAccounts(paymentAccounts.data);
      else setError(paymentAccounts.error.message);
    });
  });

  function selectItem(item: MenuItem) {
    if (order()?.bill_state !== 'open') return;
    if (item.groups.length > 0) setModifier(item);
    else addItem(item);
  }

  async function addDraftItems() {
    if (!online()) {
      setError(strings.errors.NETWORK_ERROR);
      return;
    }
    const current = order();
    if (!current || current.bill_state !== 'open' || cartState.items.length === 0) return;
    setBusy(true);
    const result = await addItemsToOpenBill(
      current.id,
      cartState.items.map((item) => ({
        menu_item_id: item.menu.id,
        qty: item.quantity,
        modifier_option_ids: item.modifiers.map((option) => option.id),
        note: item.note,
      }))
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    clearCart();
    setNotice(strings.openBill.itemsAdded);
    await refresh();
  }

  async function applyVoucher() {
    setVoucherError('');
    const parsed = openBillVoucherSchema.safeParse({ code: voucherCode() });
    if (!parsed.success) {
      setVoucherError(strings.errors.VOUCHER_NOT_FOUND);
      return;
    }
    const current = order();
    if (!current) return;
    const result = await applyVoucherToOrder(current.id, parsed.data.code);
    if (!result.ok) {
      setVoucherError(result.error.message);
      return;
    }
    setVoucherCode('');
    setNotice(strings.openBill.voucherApplied);
    await refresh();
  }

  async function finish(payments: PaymentLine[]) {
    const current = order();
    if (!current || current.bill_state !== 'open') return;
    if (!online()) {
      setError(strings.errors.NETWORK_ERROR);
      return;
    }
    setBusy(true);
    const result = await closeOpenBill(current.id, payments);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    clearCart();
    setPaymentOpen(false);
    setNotice(strings.openBill.billClosed);
    await refresh();
  }

  return (
    <main class="open-bill-page">
      <Show when={!online()}>
        <Banner variant="warning">{strings.pos.connectionRequired}</Banner>
      </Show>
      <Show when={error()}>
        <Banner variant="danger">{error()}</Banner>
      </Show>
      <Show when={notice()}>
        <p class="form-message" role="status">
          {notice()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <Show when={order()} fallback={<p>{strings.errors.ORDER_NOT_FOUND}</p>}>
          {(current) => (
            <>
              <header class="open-bill-header">
                <Button variant="ghost" onClick={() => navigate('/orders')}>
                  <ArrowLeft size={18} aria-hidden={true} />
                  {strings.orders.title}
                </Button>
                <div>
                  <p class="page-eyebrow">{strings.openBill.title}</p>
                  <h1>{current().order_no}</h1>
                  <p>
                    {current().table_label ?? current().customer_name ?? strings.openBill.table}
                  </p>
                </div>
                <StatusBadge status={current().bill_state === 'open' ? 'open' : 'closed'} />
                <Money value={current().grand_total} class="open-bill-header__total" />
              </header>
              <Show
                when={current().bill_state === 'open'}
                fallback={
                  <Card class="open-bill-readonly">
                    <Check size={24} aria-hidden={true} />
                    <p>{strings.openBill.alreadyClosed}</p>
                    <Button onClick={() => navigate(`/orders/${current().id}`)}>
                      {strings.orderDetail.title}
                    </Button>
                  </Card>
                }
              >
                <div class="open-bill-workspace">
                  <section class="open-bill-menu">
                    <div class="open-bill-menu__toolbar">
                      <SearchInput label={strings.pos.searchMenu} onSearch={setSearch} />
                      <div class="voucher-entry">
                        <input
                          class="input"
                          value={voucherCode()}
                          placeholder={strings.pos.voucherCode}
                          onInput={(event) =>
                            setVoucherCode(event.currentTarget.value.toUpperCase())
                          }
                        />
                        <Button
                          variant="secondary"
                          onClick={applyVoucher}
                          disabled={!voucherCode()}
                        >
                          {strings.openBill.applyVoucher}
                        </Button>
                        <Show when={voucherError()}>
                          <p class="form-message form-message--error" role="alert">
                            {voucherError()}
                          </p>
                        </Show>
                      </div>
                    </div>
                    <CatalogGrid
                      categories={categories()}
                      items={visibleItems()}
                      activeCategory={category()}
                      onCategoryChange={setCategory}
                      onSelect={selectItem}
                    />
                    <section class="open-bill-existing">
                      <h2>{strings.openBill.title}</h2>
                      <Show
                        when={current().order_items.length > 0}
                        fallback={<p>{strings.openBill.noItems}</p>}
                      >
                        <For each={current().order_items}>
                          {(item) => (
                            <div class="open-bill-existing__item">
                              <span>
                                {item.qty} × {item.item_name}
                              </span>
                              <Money value={item.line_total} />
                            </div>
                          )}
                        </For>
                      </Show>
                    </section>
                  </section>
                  <CartPanel
                    items={cartState.items}
                    subtotal={draftTotals().subtotal}
                    discount={draftTotals().discountTotal}
                    service={draftTotals().serviceAmount}
                    tax={draftTotals().taxAmount}
                    rounding={draftTotals().roundingAmount}
                    total={draftTotals().grandTotal}
                    voucherCode=""
                    voucherInput=""
                    voucherError=""
                    onVoucherInput={() => undefined}
                    onApplyVoucher={() => undefined}
                    onClearVoucher={clearVoucher}
                    onQuantityChange={changeQuantity}
                    onRemove={removeItem}
                    onClear={clearCart}
                    onOpenBill={() => void addDraftItems()}
                    onPay={() => setPaymentOpen(true)}
                    openBillLabel={strings.openBill.addItems}
                    payLabel={strings.openBill.closeBill}
                    allowPayEmpty
                  />
                </div>
              </Show>
            </>
          )}
        </Show>
      </Show>
      <ModifierDialog
        item={modifier()}
        onClose={() => setModifier(null)}
        onAdd={(item, options, note) => addItem(item, options, note)}
      />
      <PaymentDialog
        open={paymentOpen()}
        total={order()?.grand_total ?? 0}
        accounts={accounts()}
        loading={busy()}
        error={error()}
        onClose={() => setPaymentOpen(false)}
        onSubmit={(payments) => void finish(payments)}
      />
    </main>
  );
}
