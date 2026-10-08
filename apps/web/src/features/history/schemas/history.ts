import { z } from 'zod';

export const historyFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
  cashierId: z.string().optional(),
  orderType: z.enum(['dine_in', 'takeaway']).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export type HistoryFilter = z.infer<typeof historyFilterSchema>;

export const transactionStatusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'new', label: 'Baru' },
  { value: 'processing', label: 'Diproses' },
  { value: 'ready', label: 'Menunggu Diambil' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
] as const;

export const paymentMethodOptions = [
  { value: '', label: 'Semua Metode' },
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'ewallet', label: 'E-Wallet' },
] as const;

export const orderTypeOptions = [
  { value: '', label: 'Semua Tipe' },
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
] as const;
