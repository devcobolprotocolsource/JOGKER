export type AppErrorCode =
  | 'SHIFT_NOT_OPEN'
  | 'OPEN_BILL_REMAINS'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_STATUS_TRANSITION_INVALID'
  | 'PAYMENT_NOT_VERIFIED'
  | 'PAYMENT_TOTAL_MISMATCH'
  | 'VOUCHER_NOT_FOUND'
  | 'VOUCHER_INACTIVE'
  | 'VOUCHER_EXPIRED'
  | 'VOUCHER_QUOTA_EXCEEDED'
  | 'VOUCHER_MINIMUM_NOT_MET'
  | 'STOCK_INSUFFICIENT'
  | 'BILL_CLOSED'
  | 'REASON_REQUIRED'
  | 'NOT_AUTHORIZED'
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
}

export const errorMessages: Record<AppErrorCode, string> = {
  SHIFT_NOT_OPEN: 'Buka kasir sebelum membuat transaksi.',
  OPEN_BILL_REMAINS: 'Tutup atau batalkan open bill sebelum menutup kasir.',
  ORDER_NOT_FOUND: 'Pesanan tidak ditemukan.',
  ORDER_STATUS_TRANSITION_INVALID: 'Perubahan status pesanan tidak diizinkan.',
  PAYMENT_NOT_VERIFIED:
    'Pembayaran harus terverifikasi sebelum pesanan selesai.',
  PAYMENT_TOTAL_MISMATCH: 'Jumlah pembayaran tidak sama dengan total tagihan.',
  VOUCHER_NOT_FOUND: 'Kode voucher tidak ditemukan.',
  VOUCHER_INACTIVE: 'Voucher sudah tidak aktif.',
  VOUCHER_EXPIRED: 'Voucher belum berlaku atau sudah kedaluwarsa.',
  VOUCHER_QUOTA_EXCEEDED: 'Kuota voucher sudah habis.',
  VOUCHER_MINIMUM_NOT_MET: 'Belanja belum memenuhi minimum voucher.',
  STOCK_INSUFFICIENT: 'Stok bahan tidak mencukupi.',
  BILL_CLOSED: 'Open bill sudah ditutup.',
  REASON_REQUIRED: 'Alasan wajib diisi untuk tindakan ini.',
  NOT_AUTHORIZED: 'Anda tidak memiliki izin untuk tindakan ini.',
  NETWORK_ERROR: 'Koneksi terputus. Periksa internet lalu coba lagi.',
  REQUEST_TIMEOUT: 'Koneksi lambat, coba lagi.',
  UNKNOWN: 'Terjadi kesalahan. Silakan coba lagi.',
};

export function mapAppError(input: unknown): AppError {
  const message =
    typeof input === 'object' && input !== null && 'message' in input
      ? String(input.message)
      : '';
  const code = message in errorMessages ? (message as AppErrorCode) : 'UNKNOWN';
  return { code, message: errorMessages[code] };
}
