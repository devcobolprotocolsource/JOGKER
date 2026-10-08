import { z } from 'zod';

export const paymentAccountSchema = z.object({
  method: z.enum(['transfer', 'ewallet']),
  provider: z.string().min(1, 'Penyedia wajib diisi'),
  account_name: z.string().min(1, 'Nama pemilik wajib diisi'),
  account_no: z.string().min(1, 'Nomor rekening wajib diisi'),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const paymentAccountUpdateSchema = paymentAccountSchema.partial();

export type PaymentAccountInput = z.infer<typeof paymentAccountSchema>;
export type PaymentAccountUpdateInput = z.infer<typeof paymentAccountUpdateSchema>;

export const paymentMethodOptions = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
] as const;

export const paymentAccountMethodOptions = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
] as const;

export const paymentStatusOptions = [
  { value: 'pending_verification', label: 'Menunggu Verifikasi' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'rejected', label: 'Ditolak' },
] as const;
