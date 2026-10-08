export type StockStatus = 'safe' | 'low' | 'out';

export function stockStatus(current: number, minimum: number): StockStatus {
  if (current <= 0) return 'out';
  if (current <= minimum) return 'low';
  return 'safe';
}

export function stockValue(quantity: number, unitCost: number): number {
  return Math.round(quantity * unitCost);
}
