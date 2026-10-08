import { describe, expect, it } from 'vitest';
import { calculateTotals } from './totals';

const settings = {
  servicePercent: 10,
  taxPercent: 10,
  roundingRule: 'none' as const,
};

describe('calculateTotals', () => {
  it('matches the server calculation order with modifier, voucher, service, and tax', () => {
    expect(
      calculateTotals([{ unitPrice: 20000, quantity: 2, modifierPrices: [1000] }], settings, {
        type: 'percent',
        value: 10,
        maxDiscount: 3000,
      })
    ).toEqual({
      subtotal: 42000,
      discountTotal: 3000,
      serviceAmount: 3900,
      taxAmount: 4290,
      roundingAmount: 0,
      grandTotal: 47190,
    });
  });

  it('caps nominal discount at subtotal and rounds to the nearest hundred', () => {
    expect(
      calculateTotals(
        [{ unitPrice: 149, quantity: 1 }],
        {
          servicePercent: 0,
          taxPercent: 0,
          roundingRule: 'nearest_100',
        },
        { type: 'nominal', value: 500 }
      )
    ).toMatchObject({
      subtotal: 149,
      discountTotal: 149,
      roundingAmount: 0,
      grandTotal: 0,
    });
  });

  it('rounds percentages using integer rupiah rules and supports round-up', () => {
    expect(
      calculateTotals([{ unitPrice: 105, quantity: 1 }], {
        servicePercent: 0,
        taxPercent: 0,
        roundingRule: 'up_100',
      })
    ).toMatchObject({ roundingAmount: 95, grandTotal: 200 });
  });

  it('returns zero totals for an empty cart', () => {
    expect(
      calculateTotals([], {
        servicePercent: 0,
        taxPercent: 0,
        roundingRule: 'none',
      }).grandTotal
    ).toBe(0);
  });

  it('rejects invalid money, quantity, and percentage values', () => {
    expect(() => calculateTotals([{ unitPrice: 1.5, quantity: 1 }], settings)).toThrow(RangeError);
    expect(() => calculateTotals([{ unitPrice: 1, quantity: 0 }], settings)).toThrow(RangeError);
    expect(() =>
      calculateTotals([{ unitPrice: 1, quantity: 1 }], {
        ...settings,
        taxPercent: 101,
      })
    ).toThrow(RangeError);
  });
});
