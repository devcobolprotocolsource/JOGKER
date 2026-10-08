import type { CartItem, MenuItem } from '../state/cart';
import { calculateTotals } from '../../../shared/lib/totals';
import type { TotalSettings } from '../../../shared/lib/totals';

export function cartTotals(items: CartItem[], settings: TotalSettings, discountValue = 0) {
  return calculateTotals(
    items.map((item) => ({
      unitPrice: item.menu.price,
      quantity: item.quantity,
      modifierPrices: item.modifiers.map((modifier) => modifier.extra_price),
    })),
    settings,
    discountValue > 0 ? { type: 'nominal', value: discountValue } : null
  );
}

export function addCartLine(
  current: CartItem[],
  menu: MenuItem,
  modifiers: CartItem['modifiers'] = [],
  note = ''
): CartItem[] {
  const modifierIds = modifiers
    .map((modifier) => modifier.id)
    .sort()
    .join(',');
  const existing = current.find(
    (item) =>
      item.menu.id === menu.id &&
      item.modifiers
        .map((modifier) => modifier.id)
        .sort()
        .join(',') === modifierIds &&
      item.note === note
  );
  if (existing)
    return current.map((item) =>
      item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item
    );
  return [
    ...current,
    {
      key: `${menu.id}:${modifierIds}:${crypto.randomUUID()}`,
      menu,
      modifiers,
      quantity: 1,
      note,
    },
  ];
}

export function setCartQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity < 1) return items.filter((item) => item.key !== key);
  return items.map((item) => (item.key === key ? { ...item, quantity } : item));
}

export function cartItemTotal(item: CartItem): number {
  return (
    (item.menu.price + item.modifiers.reduce((sum, modifier) => sum + modifier.extra_price, 0)) *
    item.quantity
  );
}
