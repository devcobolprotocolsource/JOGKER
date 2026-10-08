export type RoundingRule = 'none' | 'up_100' | 'nearest_100';

export interface CartLine {
  unitPrice: number;
  quantity: number;
  modifierPrices?: number[];
}

export interface Discount {
  type: 'percent' | 'nominal';
  value: number;
  maxDiscount?: number | null;
}

export interface TotalSettings {
  servicePercent: number;
  taxPercent: number;
  roundingRule: RoundingRule;
}

export interface CalculatedTotals {
  subtotal: number;
  discountTotal: number;
  serviceAmount: number;
  taxAmount: number;
  roundingAmount: number;
  grandTotal: number;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} harus berupa integer rupiah yang aman.`);
  }
}

function percentInteger(amount: number, percent: number): number {
  assertInteger(amount, 'Nominal');
  const percentText = String(percent);
  if (!/^(?:100(?:\.0{1,2})?|(?:\d|[1-9]\d)(?:\.\d{1,2})?)$/.test(percentText)) {
    throw new RangeError('Persentase harus berada di antara 0 dan 100.');
  }
  const [whole = '0', fraction = ''] = percentText.split('.');
  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  return Number((BigInt(amount) * basisPoints + 5000n) / 10000n);
}

export function calculateTotals(
  lines: CartLine[],
  settings: TotalSettings,
  discount?: Discount | null
): CalculatedTotals {
  let subtotal = 0n;
  for (const line of lines) {
    assertInteger(line.unitPrice, 'Harga');
    assertInteger(line.quantity, 'Jumlah');
    if (line.unitPrice < 0 || line.quantity < 1) {
      throw new RangeError('Harga dan jumlah item tidak valid.');
    }
    const modifierTotal = (line.modifierPrices ?? []).reduce((total, price) => {
      assertInteger(price, 'Harga modifier');
      if (price < 0) throw new RangeError('Harga modifier tidak boleh negatif.');
      return total + BigInt(price);
    }, 0n);
    subtotal += (BigInt(line.unitPrice) + modifierTotal) * BigInt(line.quantity);
  }

  const subtotalNumber = Number(subtotal);
  assertInteger(subtotalNumber, 'Subtotal');
  let discountTotal = 0;
  if (discount) {
    assertInteger(discount.value, 'Diskon');
    if (discount.value <= 0) throw new RangeError('Nilai diskon harus lebih dari nol.');
    if (discount.type === 'percent') {
      discountTotal = percentInteger(subtotalNumber, discount.value);
      if (discount.maxDiscount != null) {
        assertInteger(discount.maxDiscount, 'Batas diskon');
        if (discount.maxDiscount < 0) throw new RangeError('Batas diskon tidak valid.');
        discountTotal = Math.min(discountTotal, discount.maxDiscount);
      }
    } else {
      discountTotal = Math.min(discount.value, subtotalNumber);
    }
  }

  const base = subtotalNumber - discountTotal;
  const serviceAmount = percentInteger(base, settings.servicePercent);
  const taxAmount = percentInteger(base + serviceAmount, settings.taxPercent);
  const preRound = base + serviceAmount + taxAmount;
  let roundingAmount = 0;
  if (settings.roundingRule === 'up_100') {
    roundingAmount = (100 - (preRound % 100)) % 100;
  } else if (settings.roundingRule === 'nearest_100') {
    roundingAmount = Math.floor((preRound + 50) / 100) * 100 - preRound;
  }

  const grandTotal = preRound + roundingAmount;
  for (const value of [discountTotal, serviceAmount, taxAmount, roundingAmount, grandTotal]) {
    assertInteger(value, 'Total');
  }
  return {
    subtotal: subtotalNumber,
    discountTotal,
    serviceAmount,
    taxAmount,
    roundingAmount,
    grandTotal,
  };
}
