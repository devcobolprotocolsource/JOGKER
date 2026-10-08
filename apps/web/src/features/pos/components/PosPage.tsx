import { createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Check, Search } from 'lucide-solid';
import { refreshShift, shiftState } from '../../../shared/stores/shift';
import { refreshSettings, settingsState } from '../../../shared/stores/settings';
import { online } from '../../../shared/stores/connection';
import { strings } from '../../../shared/strings';
import { Banner, Button, ConfirmDialog, Money, SearchInput } from '../../../shared/ui';
import { CatalogGrid } from './CatalogGrid';
import { CartPanel } from './CartPanel';
import { ModifierDialog } from './ModifierDialog';
import { PaymentDialog } from './PaymentDialog';
import {
  cartState,
  addItem,
  changeQuantity,
  clearCart,
  clearVoucher,
  removeItem,
  setVoucher,
  type MenuItem,
} from '../state/cart';
import { cartTotals } from '../logic/cart';
import {
  createOrder,
  loadCatalog,
  loadPaymentAccounts,
  submitPayment,
  validateVoucherCode,
  type Category,
  type PaymentAccount,
  type PaymentLine,
} from '../api/pos';

export function PosPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [menuItems, setMenuItems] = createSignal<MenuItem[]>([]);
  const [accounts, setAccounts] = createSignal<PaymentAccount[]>([]);
  const [activeCategory, setActiveCategory] = createSignal('');
  const [search, setSearch] = createSignal('');
  const [modifierItem, setModifierItem] = createSignal<MenuItem | null>(null);
  const [paymentOpen, setPaymentOpen] = createSignal(false);
  const [clearConfirmOpen, setClearConfirmOpen] = createSignal(false);
  const [voucherInput, setVoucherInput] = createSignal('');
  const [voucherError, setVoucherError] = createSignal('');
  const [requestError, setRequestError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [catalogLoading, setCatalogLoading] = createSignal(true);
  const [orderType, setOrderType] = createSignal<'dine_in' | 'takeaway'>('takeaway');
  const [checkoutOrder, setCheckoutOrder] = createSignal<{
    id: string;
    order_no: string;
    grand_total: number;
  } | null>(null);
  const [successfulOrder, setSuccessfulOrder] = createSignal<{
    id: string;
    order_no: string;
    grand_total: number;
  } | null>(null);
  const [paymentLines, setPaymentLines] = createSignal<PaymentLine[]>([]);
  const [paidLineCount, setPaidLineCount] = createSignal(0);

  const totalSettings = () => ({
    servicePercent: settingsState.value?.service_percent ?? 0,
    taxPercent: settingsState.value?.tax_percent ?? 0,
    roundingRule: settingsState.value?.rounding_rule ?? ('none' as const),
  });
  const totals = createMemo(() =>
    cartTotals(cartState.items, totalSettings(), cartState.voucherDiscount)
  );
  const visibleItems = createMemo(() => {
    const query = search().trim().toLocaleLowerCase('id-ID');
    return menuItems().filter(
      (item) =>
        (!activeCategory() || item.category_id === activeCategory()) &&
        (!query || item.name.toLocaleLowerCase('id-ID').includes(query))
    );
  });

  onMount(() => {
    let alive = true;
    void (async () => {
      await refreshShift();
      await refreshSettings();
      if (!shiftState.active) {
        setCatalogLoading(false);
        return;
      }
      const [catalog, paymentAccounts] = await Promise.all([loadCatalog(), loadPaymentAccounts()]);
      if (!alive) return;
      if (catalog.ok) {
        setCategories(catalog.data.categories);
        setMenuItems(catalog.data.items);
      } else setRequestError(catalog.error.message);
      if (paymentAccounts.ok) setAccounts(paymentAccounts.data);
      else setRequestError(paymentAccounts.error.message);
      setCatalogLoading(false);
    })();

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (typing) {
        if (event.key === 'F2') {
          event.preventDefault();
          setPaymentOpen(true);
        }
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.pos-search input')?.focus();
      } else if (event.key === 'F2') {
        event.preventDefault();
        if (cartState.items.length > 0) setPaymentOpen(true);
      } else if (event.key === 'F3') {
        event.preventDefault();
        void openBill();
      } else if (event.key === 'F4') {
        event.preventDefault();
        document.getElementById('voucher-code')?.focus();
      } else if (/^[1-9]$/.test(event.key)) {
        const item = visibleItems()[Number(event.key) - 1];
        if (item) addMenuItem(item);
      } else if (event.key === '+' && cartState.items[0]) {
        changeQuantity(cartState.items[0].key, cartState.items[0].quantity + 1);
      } else if (event.key === '-' && cartState.items[0]) {
        changeQuantity(cartState.items[0].key, cartState.items[0].quantity - 1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => {
      alive = false;
      document.removeEventListener('keydown', onKeyDown);
    });
  });

  function addMenuItem(item: MenuItem) {
    if (item.groups.length > 0) setModifierItem(item);
    else addItem(item);
  }

  async function applyVoucher() {
    setVoucherError('');
    const result = await validateVoucherCode(voucherInput().trim(), totals().subtotal);
    if (!result.ok) {
      setVoucherError(result.error.message);
      return;
    }
    setVoucher(voucherInput().trim(), result.data.discount);
    setVoucherInput('');
  }

  async function openBill() {
    if (!online()) {
      setRequestError(strings.errors.NETWORK_ERROR);
      return;
    }
    if (cartState.items.length === 0 || !shiftState.active) return;
    setLoading(true);
    const result = await createOrder({
      orderType: orderType(),
      items: cartState.items.map((item) => ({
        menu_item_id: item.menu.id,
        qty: item.quantity,
        modifier_option_ids: item.modifiers.map((modifier) => modifier.id),
        note: item.note,
      })),
      billMode: 'open',
    });
    setLoading(false);
    if (!result.ok) {
      setRequestError(result.error.message);
      return;
    }
    clearCart();
    navigate(`/pos/open-bill/${result.data.id}`);
  }

  async function pay(lines: PaymentLine[]) {
    if (!online()) {
      setRequestError(strings.errors.NETWORK_ERROR);
      return;
    }
    if (!shiftState.active) {
      setRequestError(strings.errors.SHIFT_NOT_OPEN);
      return;
    }
    setLoading(true);
    setRequestError('');
    let order = checkoutOrder();
    if (!order) {
      const created = await createOrder({
        orderType: orderType(),
        items: cartState.items.map((item) => ({
          menu_item_id: item.menu.id,
          qty: item.quantity,
          modifier_option_ids: item.modifiers.map((modifier) => modifier.id),
          note: item.note,
        })),
        voucherCode: cartState.voucherCode || undefined,
      });
      if (!created.ok) {
        setLoading(false);
        setRequestError(created.error.message);
        return;
      }
      order = created.data;
      setCheckoutOrder(order);
      setPaymentLines(lines);
      setPaidLineCount(0);
    }
    const retryLines = paymentLines().length > 0 ? paymentLines() : lines;
    for (let index = paidLineCount(); index < retryLines.length; index += 1) {
      const payment = await submitPayment(order.id, retryLines[index]!);
      if (!payment.ok) {
        setLoading(false);
        setRequestError(strings.pos.paymentError);
        return;
      }
      setPaidLineCount(index + 1);
    }
    clearCart();
    setPaymentOpen(false);
    setCheckoutOrder(null);
    setPaymentLines([]);
    setPaidLineCount(0);
    setLoading(false);
    setRequestError('');
    setSuccessfulOrder(order);
  }

  function newOrder() {
    setSuccessfulOrder(null);
    setRequestError('');
  }

  return (
    <main class="pos-page">
      <Show when={!online()}>
        <Banner variant="warning">{strings.pos.connectionRequired}</Banner>
      </Show>
      <Show when={requestError()}>
        <Banner variant="danger">{requestError()}</Banner>
      </Show>
      <Show
        when={successfulOrder()}
        fallback={
          <Show
            when={shiftState.active}
            fallback={
              <section class="pos-empty">
                <h1>{strings.pos.title}</h1>
                <p>{strings.pos.noShift}</p>
                <Button variant="primary" onClick={() => navigate('/shift')}>
                  {strings.pos.openShift}
                </Button>
              </section>
            }
          >
            <header class="pos-toolbar">
              <div class="pos-search">
                <SearchInput label={strings.pos.searchMenu} onSearch={setSearch} />
              </div>
              <div class="order-type-control" role="group" aria-label={strings.pos.orderType}>
                <button
                  type="button"
                  aria-pressed={orderType() === 'takeaway'}
                  onClick={() => setOrderType('takeaway')}
                >
                  {strings.pos.takeaway}
                </button>
                <button
                  type="button"
                  aria-pressed={orderType() === 'dine_in'}
                  onClick={() => setOrderType('dine_in')}
                >
                  {strings.pos.dineIn}
                </button>
              </div>
              <span class="pos-shortcut-hint">
                <Search size={16} aria-hidden={true} /> / · F2 {strings.pos.pay}
              </span>
            </header>
            <Show
              when={!catalogLoading()}
              fallback={
                <section class="pos-empty" role="status">
                  {strings.common.loading}
                </section>
              }
            >
              <div class="pos-workspace">
                <CatalogGrid
                  categories={categories()}
                  items={visibleItems()}
                  activeCategory={activeCategory()}
                  onCategoryChange={setActiveCategory}
                  onSelect={addMenuItem}
                />
                <CartPanel
                  items={cartState.items}
                  subtotal={totals().subtotal}
                  discount={totals().discountTotal}
                  service={totals().serviceAmount}
                  tax={totals().taxAmount}
                  rounding={totals().roundingAmount}
                  total={totals().grandTotal}
                  voucherCode={cartState.voucherCode}
                  voucherInput={voucherInput()}
                  voucherError={voucherError()}
                  onVoucherInput={setVoucherInput}
                  onApplyVoucher={applyVoucher}
                  onClearVoucher={clearVoucher}
                  onQuantityChange={changeQuantity}
                  onRemove={removeItem}
                  onClear={() => setClearConfirmOpen(true)}
                  onPay={() => setPaymentOpen(true)}
                  onOpenBill={() => void openBill()}
                />
              </div>
            </Show>
          </Show>
        }
      >
        <section class="checkout-success" aria-live="polite">
          <Check size={44} aria-hidden="true" />
          <h1>{strings.pos.orderSuccess}</h1>
          <p class="order-number">{successfulOrder()?.order_no}</p>
          <Money value={successfulOrder()?.grand_total ?? 0} />
          <div class="success-actions">
            <Button variant="primary" onClick={newOrder}>
              {strings.pos.newOrder}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              {strings.pos.viewOrders}
            </Button>
          </div>
        </section>
      </Show>
      <ModifierDialog
        item={modifierItem()}
        onClose={() => setModifierItem(null)}
        onAdd={(item, modifiers, note) => addItem(item, modifiers, note)}
      />
      <PaymentDialog
        open={paymentOpen()}
        total={checkoutOrder()?.grand_total ?? totals().grandTotal}
        accounts={accounts()}
        loading={loading()}
        error={requestError()}
        onClose={() => setPaymentOpen(false)}
        onSubmit={(lines) => void pay(lines)}
      />
      <ConfirmDialog
        open={clearConfirmOpen()}
        title={strings.pos.clearCart}
        description={strings.pos.confirmClearCart}
        destructive
        confirmLabel={strings.pos.clearCart}
        cancelLabel={strings.common.cancel}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          setClearConfirmOpen(false);
        }}
      />
    </main>
  );
}
