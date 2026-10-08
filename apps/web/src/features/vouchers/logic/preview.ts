import { calculateTotals } from '../../../shared/lib/totals';

export function voucherPreview(
  type: 'percent' | 'nominal',
  value: number,
  maxDiscount: number | null
) {
  const totals = calculateTotals(
    [{ unitPrice: 100000, quantity: 1 }],
    {
      servicePercent: 0,
      taxPercent: 0,
      roundingRule: 'none',
    },
    { type, value, maxDiscount }
  );
  return { discount: totals.discountTotal, total: totals.grandTotal };
}
