import { describe, expect, it } from 'vitest';
import { mapAppError } from './app-error';
import { formatDateJakarta, formatNumber, formatRupiah, formatTimeJakarta } from './format';
import { canTransitionOrder } from './order-status';
import { buildReceipt } from './receipt';
import { validateVoucher, type VoucherInput } from './voucher';
import { contrastRatio, getContrastText, hasWcagAAContrast, parseHexColor } from './color';

describe('formatters', () => {
  it('formats integer rupiah and Indonesian numbers', () => {
    expect(formatRupiah(12500)).toBe('Rp 12.500');
    expect(formatRupiah(-500)).toContain('-');
    expect(formatNumber(12345.5)).toBe('12.345,5');
    expect(() => formatRupiah(1.25)).toThrow(RangeError);
  });

  it('formats date and time in Asia/Jakarta', () => {
    const value = new Date('2026-10-07T18:30:00.000Z');
    expect(formatDateJakarta(value)).toBe('8 Okt 2026');
    expect(formatTimeJakarta(value)).toBe('01.30');
  });
});

describe('voucher validation', () => {
  const activeVoucher: VoucherInput = {
    code: 'HEMAT10',
    type: 'percent',
    value: 10,
    minSubtotal: 20000,
    maxDiscount: 5000,
    validFrom: '2026-10-01T00:00:00Z',
    validUntil: '2026-10-31T23:59:59Z',
    usedCount: 0,
    totalQuota: 10,
    isActive: true,
  };
  const now = new Date('2026-10-08T00:00:00Z');

  it('validates percent and nominal vouchers', () => {
    expect(validateVoucher(activeVoucher, 50000, now)).toEqual({
      valid: true,
      discount: 5000,
    });
    expect(validateVoucher({ ...activeVoucher, type: 'nominal', value: 4000 }, 50000, now)).toEqual(
      { valid: true, discount: 4000 }
    );
  });

  it('returns specific failure reasons', () => {
    expect(validateVoucher(null, 50000, now)).toMatchObject({
      reason: 'VOUCHER_NOT_FOUND',
    });
    expect(validateVoucher({ ...activeVoucher, isActive: false }, 50000, now)).toMatchObject({
      reason: 'VOUCHER_INACTIVE',
    });
    expect(
      validateVoucher({ ...activeVoucher, validUntil: '2026-10-02T00:00:00Z' }, 50000, now)
    ).toMatchObject({ reason: 'VOUCHER_EXPIRED' });
    expect(validateVoucher({ ...activeVoucher, usedCount: 10 }, 50000, now)).toMatchObject({
      reason: 'VOUCHER_QUOTA_EXCEEDED',
    });
    expect(validateVoucher(activeVoucher, 10000, now)).toMatchObject({
      reason: 'VOUCHER_MINIMUM_NOT_MET',
    });
    expect(validateVoucher(activeVoucher, -1, now)).toMatchObject({
      reason: 'VOUCHER_INVALID',
    });
  });
});

describe('order transitions and AppError', () => {
  it('accepts only business-approved status transitions', () => {
    expect(canTransitionOrder('new', 'processing')).toBe(true);
    expect(canTransitionOrder('ready', 'processing')).toBe(true);
    expect(canTransitionOrder('completed', 'processing')).toBe(false);
    expect(canTransitionOrder('cancelled', 'new')).toBe(false);
  });

  it('maps known and unknown server errors to Indonesian messages', () => {
    expect(mapAppError({ message: 'STOCK_INSUFFICIENT' })).toMatchObject({
      code: 'STOCK_INSUFFICIENT',
    });
    expect(mapAppError(new Error('network unavailable'))).toMatchObject({
      code: 'UNKNOWN',
    });
    expect(mapAppError(null).message).toMatch(/Terjadi kesalahan/);
  });
});

describe('color contrast', () => {
  it('parses short and long hex colors and rejects malformed values', () => {
    expect(parseHexColor('#abc')).toEqual({ red: 170, green: 187, blue: 204 });
    expect(parseHexColor('6F4E37')).toEqual({ red: 111, green: 78, blue: 55 });
    expect(parseHexColor('coffee')).toBeNull();
  });

  it('computes WCAG contrast and chooses the strongest readable text color', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    expect(hasWcagAAContrast('#ffffff', '#6F4E37')).toBe(true);
    expect(hasWcagAAContrast('#777777', '#888888')).toBe(false);
    expect(getContrastText('#6F4E37')).toBe('#FFFFFF');
    expect(getContrastText('#F5E6D3')).toBe('#1B1410');
    expect(contrastRatio('invalid', '#fff')).toBeNull();
  });
});

describe('ESC/POS receipt', () => {
  const receipt = {
    storeName: 'JOKGER Coffee',
    address: 'Jakarta',
    phone: '021-555',
    header: 'Terima kasih',
    orderNo: 'JKG-20261008-0001',
    createdAt: '2026-10-08T01:00:00+07:00',
    tableLabel: 'Meja 1',
    lines: [
      {
        name: 'Cafe Latte',
        quantity: 2,
        lineTotal: 44000,
        modifiers: ['Gula normal'],
      },
    ],
    subtotal: 44000,
    discountTotal: 5000,
    voucherCode: 'HEMAT',
    serviceAmount: 3900,
    taxAmount: 4290,
    roundingAmount: 10,
    grandTotal: 47190,
    payments: [{ method: 'Tunai', amount: 50000 }],
    change: 2810,
    footer: 'Sampai jumpa',
  };

  it.each([58, 80] as const)('builds %s mm receipt bytes in chunks no larger than 100', (width) => {
    const chunks = buildReceipt(receipt, width, true);
    const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100);
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('JOKGER Coffee');
    expect(text).toContain('JKG-20261008-0001');
    expect(text).toContain('TOTAL');
    expect(text).toContain('*** REPRINT ***');
    expect(text).toContain('\u001dV');
  });
});
