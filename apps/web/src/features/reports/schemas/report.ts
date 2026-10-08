import { z } from 'zod';

export const reportDateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ReportDateRange = z.infer<typeof reportDateRangeSchema>;

export const reportPresets = [
  { value: 'today', label: 'Hari ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: '7days', label: '7 hari terakhir' },
  { value: '30days', label: '30 hari terakhir' },
  { value: 'thisMonth', label: 'Bulan ini' },
  { value: 'lastMonth', label: 'Bulan lalu' },
] as const;

export const reportTabs = [
  { id: 'summary', label: 'Ringkasan' },
  { id: 'daily', label: 'Per Hari' },
  { id: 'hourly', label: 'Per Jam' },
  { id: 'category', label: 'Per Kategori' },
  { id: 'item', label: 'Per Item' },
  { id: 'method', label: 'Per Metode' },
  { id: 'voucher', label: 'Voucher' },
] as const;
