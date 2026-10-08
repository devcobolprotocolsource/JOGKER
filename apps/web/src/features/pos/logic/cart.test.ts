import { describe, expect, it } from 'vitest';
import { addCartLine, cartItemTotal, cartTotals, setCartQuantity } from './cart';
import type { MenuItem } from '../state/cart';

const menu: MenuItem = {
  id: 'menu-latte',
  category_id: 'coffee',
  name: 'Latte',
  description: null,
  price: 22000,
  image_path: null,
  is_available: true,
  groups: [],
};

describe('POS cart logic', () => {
  it('merges identical menu/modifier/note lines and preserves distinct notes', () => {
    const one = addCartLine([], menu);
    const merged = addCartLine(one, menu);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.quantity).toBe(2);
    expect(addCartLine(merged, menu, [], 'Tanpa es')).toHaveLength(2);
  });

  it('updates quantities or removes a line below one', () => {
    const cart = addCartLine([], menu);
    const key = cart[0]!.key;
    expect(setCartQuantity(cart, key, 4)[0]?.quantity).toBe(4);
    expect(setCartQuantity(cart, key, 0)).toEqual([]);
  });

  it('calculates line and order totals with integer rupiah settings', () => {
    const cart = addCartLine([], menu);
    expect(cartItemTotal(cart[0]!)).toBe(22000);
    expect(
      cartTotals(cart, {
        servicePercent: 10,
        taxPercent: 10,
        roundingRule: 'none',
      })
    ).toMatchObject({
      subtotal: 22000,
      serviceAmount: 2200,
      taxAmount: 2420,
      grandTotal: 26620,
    });
  });

  it('matches modifiers independent of order and includes modifier prices and discounts', () => {
    const firstModifier = {
      id: 'large',
      group_id: 'size',
      name: 'Large',
      extra_price: 5000,
      is_active: true,
    };
    const secondModifier = {
      id: 'oat',
      group_id: 'milk',
      name: 'Oat milk',
      extra_price: 3000,
      is_active: true,
    };
    const cart = addCartLine([], menu, [firstModifier, secondModifier]);
    const merged = addCartLine(cart, menu, [secondModifier, firstModifier]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.quantity).toBe(2);
    expect(cartItemTotal(merged[0]!)).toBe(60000);
    expect(
      cartTotals(merged, { servicePercent: 0, taxPercent: 0, roundingRule: 'none' }, 2000)
    ).toMatchObject({ subtotal: 60000, discountTotal: 2000, grandTotal: 58000 });
  });
});
