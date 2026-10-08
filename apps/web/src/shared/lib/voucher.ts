export interface VoucherInput {
  code: string;
  type: 'percent' | 'nominal';
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  validFrom: string | Date;
  validUntil: string | Date;
  totalQuota?: number | null;
  usedCount: number;
  isActive: boolean;
}

export type VoucherValidation =
  | { valid: true; discount: number }
  | {
      valid: false;
      reason:
        | 'VOUCHER_NOT_FOUND'
        | 'VOUCHER_INACTIVE'
        | 'VOUCHER_EXPIRED'
        | 'VOUCHER_QUOTA_EXCEEDED'
        | 'VOUCHER_MINIMUM_NOT_MET'
        | 'VOUCHER_INVALID';
    };

export function validateVoucher(
  voucher: VoucherInput | null,
  subtotal: number,
  now = new Date()
): VoucherValidation {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0)
    return { valid: false, reason: 'VOUCHER_INVALID' };
  if (!voucher) return { valid: false, reason: 'VOUCHER_NOT_FOUND' };
  if (!voucher.isActive) return { valid: false, reason: 'VOUCHER_INACTIVE' };
  if (
    !Number.isSafeInteger(voucher.minSubtotal) ||
    voucher.minSubtotal < 0 ||
    !Number.isInteger(voucher.usedCount) ||
    voucher.usedCount < 0 ||
    (voucher.totalQuota != null &&
      (!Number.isInteger(voucher.totalQuota) || voucher.totalQuota < 0))
  ) {
    return { valid: false, reason: 'VOUCHER_INVALID' };
  }
  const start = new Date(voucher.validFrom).getTime();
  const end = new Date(voucher.validUntil).getTime();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    now.getTime() < start ||
    now.getTime() > end
  ) {
    return { valid: false, reason: 'VOUCHER_EXPIRED' };
  }
  if (voucher.totalQuota != null && voucher.usedCount >= voucher.totalQuota) {
    return { valid: false, reason: 'VOUCHER_QUOTA_EXCEEDED' };
  }
  if (subtotal < voucher.minSubtotal) return { valid: false, reason: 'VOUCHER_MINIMUM_NOT_MET' };
  if (!Number.isSafeInteger(voucher.value) || voucher.value <= 0) {
    return { valid: false, reason: 'VOUCHER_INVALID' };
  }
  const discount =
    voucher.type === 'percent'
      ? Math.min(
          Number((BigInt(subtotal) * BigInt(voucher.value) + 50n) / 100n),
          voucher.maxDiscount ?? subtotal
        )
      : Math.min(voucher.value, subtotal);
  return { valid: true, discount };
}
