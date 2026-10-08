import { For, onCleanup, onMount, Show, createSignal } from 'solid-js';
import { ChevronDown, ChevronUp, Minus, Plus, Trash2, TicketX } from 'lucide-solid';
import type { CartItem } from '../state/cart';
import { cartItemTotal } from '../logic/cart';
import { Button, IconButton, Money } from '../../../shared/ui';
import { strings } from '../../../shared/strings';

export function CartPanel(props: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  service: number;
  tax: number;
  rounding: number;
  total: number;
  voucherCode: string;
  voucherInput: string;
  voucherError: string;
  onVoucherInput: (value: string) => void;
  onApplyVoucher: () => void;
  onClearVoucher: () => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onPay: () => void;
  onOpenBill: () => void;
  openBillLabel?: string;
  payLabel?: string;
  allowPayEmpty?: boolean;
}) {
  const [compact, setCompact] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  let media: MediaQueryList | undefined;
  const updateViewport = () => setCompact(media?.matches ?? false);
  onMount(() => {
    media = window.matchMedia('(max-width: 1023px)');
    updateViewport();
    media.addEventListener('change', updateViewport);
  });
  onCleanup(() => media?.removeEventListener('change', updateViewport));
  return (
    <aside
      class={`cart-panel ${compact() && !expanded() ? 'cart-panel--compact' : ''}`}
      aria-label={strings.pos.cart}
    >
      <header class="cart-header">
        <button
          class="cart-header__expand"
          type="button"
          aria-expanded={!compact() || expanded()}
          onClick={() => compact() && setExpanded(!expanded())}
        >
          <h2>{strings.pos.cart}</h2>
          <span>{props.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          <Show when={compact()}>
            <Show when={expanded()} fallback={<ChevronUp size={20} aria-hidden={true} />}>
              <ChevronDown size={20} aria-hidden={true} />
            </Show>
          </Show>
        </button>
        <Money value={props.total} class="cart-header__total" />
        <Button
          variant="ghost"
          size="sm"
          disabled={props.items.length === 0 && !props.allowPayEmpty}
          onClick={props.onClear}
        >
          {strings.pos.clearCart}
        </Button>
      </header>
      <div class="cart-items" aria-live="polite">
        <Show
          when={props.items.length > 0}
          fallback={<p class="cart-empty">{strings.pos.cartEmpty}</p>}
        >
          <For each={props.items}>
            {(item) => (
              <CartRow
                item={item}
                onQuantityChange={props.onQuantityChange}
                onRemove={props.onRemove}
              />
            )}
          </For>
        </Show>
      </div>
      <div class="voucher-entry">
        <Show
          when={!props.voucherCode}
          fallback={
            <div class="voucher-chip">
              <span>{props.voucherCode}</span>
              <IconButton
                label={strings.pos.removeVoucher}
                icon={TicketX}
                onClick={props.onClearVoucher}
              />
            </div>
          }
        >
          <label class="sr-only" for="voucher-code">
            {strings.pos.voucherCode}
          </label>
          <input
            id="voucher-code"
            class="input"
            value={props.voucherInput}
            placeholder={strings.pos.voucherCode}
            onInput={(event) => props.onVoucherInput(event.currentTarget.value.toUpperCase())}
          />
          <Button variant="secondary" onClick={props.onApplyVoucher} disabled={!props.voucherInput}>
            {strings.pos.applyVoucher}
          </Button>
        </Show>
        <Show when={props.voucherError}>
          <p class="form-message form-message--error" role="alert">
            {props.voucherError}
          </p>
        </Show>
      </div>
      <div class="cart-summary">
        <div>
          <span>{strings.pos.subtotal}</span>
          <Money value={props.subtotal} />
        </div>
        <Show when={props.discount > 0}>
          <div>
            <span>{strings.pos.discount}</span>
            <Money value={-props.discount} />
          </div>
        </Show>
        <Show when={props.service > 0}>
          <div>
            <span>{strings.pos.service}</span>
            <Money value={props.service} />
          </div>
        </Show>
        <Show when={props.tax > 0}>
          <div>
            <span>{strings.pos.tax}</span>
            <Money value={props.tax} />
          </div>
        </Show>
        <Show when={props.rounding !== 0}>
          <div>
            <span>{strings.pos.rounding}</span>
            <Money value={props.rounding} />
          </div>
        </Show>
        <div class="cart-total">
          <strong>{strings.pos.total}</strong>
          <Money value={props.total} />
        </div>
      </div>
      <div class="cart-actions">
        <Button variant="secondary" disabled={props.items.length === 0} onClick={props.onOpenBill}>
          {props.openBillLabel ?? strings.pos.openBill}
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={props.items.length === 0 && !props.allowPayEmpty}
          onClick={props.onPay}
        >
          {props.payLabel ?? strings.pos.pay}
        </Button>
      </div>
    </aside>
  );
}

function CartRow(props: {
  item: CartItem;
  onQuantityChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <article class="cart-row">
      <div class="cart-row__heading">
        <strong>{props.item.menu.name}</strong>
        <Money value={cartItemTotal(props.item)} />
      </div>
      <Show when={props.item.modifiers.length > 0}>
        <ul class="cart-row__modifiers">
          <For each={props.item.modifiers}>
            {(modifier) => (
              <li>
                {modifier.name}
                <Show when={modifier.extra_price > 0}>
                  <>
                    {' '}
                    · <Money value={modifier.extra_price} />
                  </>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.item.note}>
        <p class="cart-row__note">{props.item.note}</p>
      </Show>
      <div class="cart-row__actions">
        <IconButton
          label={strings.pos.decreaseQuantity}
          icon={Minus}
          onClick={() => props.onQuantityChange(props.item.key, props.item.quantity - 1)}
        />
        <span class="cart-quantity">{props.item.quantity}</span>
        <IconButton
          label={strings.pos.increaseQuantity}
          icon={Plus}
          onClick={() => props.onQuantityChange(props.item.key, props.item.quantity + 1)}
        />
        <IconButton
          label={strings.pos.removeItem}
          icon={Trash2}
          variant="danger"
          onClick={() => props.onRemove(props.item.key)}
        />
      </div>
    </article>
  );
}
