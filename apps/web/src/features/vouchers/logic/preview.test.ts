import { describe, expect, it } from 'vitest';
import { voucherPreview } from './preview';

describe('voucherPreview', () => {
  it('calculates percentage and capped discounts', () => {
    expect(voucherPreview('percent', 10, null)).toEqual({ discount: 10000, total: 90000 });
    expect(voucherPreview('percent', 50, 12000)).toEqual({ discount: 12000, total: 88000 });
  });

  it('calculates a nominal discount without exceeding the purchase total', () => {
    expect(voucherPreview('nominal', 15000, null)).toEqual({ discount: 15000, total: 85000 });
    expect(voucherPreview('nominal', 150000, null)).toEqual({ discount: 100000, total: 0 });
  });
});
