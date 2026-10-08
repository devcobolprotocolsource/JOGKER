import { createStore } from 'solid-js/store';
import { z } from 'zod';
import { addCartLine, setCartQuantity } from '../logic/cart';
import type { ModifierOption } from '../api/pos';

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  is_available: boolean;
  groups: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  options: ModifierOption[];
}

export type { ModifierOption } from '../api/pos';

export interface CartItem {
  key: string;
  menu: MenuItem;
  modifiers: ModifierOption[];
  quantity: number;
  note: string;
}

const cartItemSchema = z.object({
  key: z.string(),
  menu: z.object({
    id: z.string(),
    category_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number().int().nonnegative(),
    image_path: z.string().nullable(),
    is_available: z.boolean(),
    groups: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        min_select: z.number().int(),
        max_select: z.number().int(),
        options: z.array(
          z.object({
            id: z.string(),
            group_id: z.string(),
            name: z.string(),
            extra_price: z.number().int(),
            is_active: z.boolean(),
          })
        ),
      })
    ),
  }),
  modifiers: z.array(
    z.object({
      id: z.string(),
      group_id: z.string(),
      name: z.string(),
      extra_price: z.number().int(),
      is_active: z.boolean(),
    })
  ),
  quantity: z.number().int().positive(),
  note: z.string(),
});
const savedCartSchema = z.array(cartItemSchema);
const storageKey = 'jokger.cart.v1';

function loadCart(): CartItem[] {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    const result = savedCartSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

const [cartState, setCartState] = createStore<{
  items: CartItem[];
  voucherCode: string;
  voucherDiscount: number;
}>({ items: loadCart(), voucherCode: '', voucherDiscount: 0 });

function persist(): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cartState.items));
  } catch {
    return;
  }
}

export function addItem(menu: MenuItem, modifiers: ModifierOption[] = [], note = ''): void {
  setCartState('items', (items) => addCartLine(items, menu, modifiers, note));
  persist();
}

export function changeQuantity(key: string, quantity: number): void {
  setCartState('items', (items) => setCartQuantity(items, key, quantity));
  persist();
}

export function removeItem(key: string): void {
  setCartState('items', (items) => items.filter((item) => item.key !== key));
  persist();
}

export function clearCart(): void {
  setCartState({ items: [], voucherCode: '', voucherDiscount: 0 });
  try {
    localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

export function setVoucher(code: string, discount: number): void {
  setCartState({ voucherCode: code.toUpperCase(), voucherDiscount: discount });
}

export function clearVoucher(): void {
  setCartState({ voucherCode: '', voucherDiscount: 0 });
}

export { cartState };
