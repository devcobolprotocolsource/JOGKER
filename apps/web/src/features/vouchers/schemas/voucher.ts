import { z } from 'zod';

export const voucherSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(40)
      .regex(/^[A-Z0-9-]+$/),
    name: z.string().trim().min(1).max(120),
    type: z.enum(['percent', 'nominal']),
    value: z.number().int().positive(),
    min_subtotal: z.number().int().nonnegative(),
    max_discount: z.number().int().nonnegative().nullable(),
    valid_from: z.string().datetime(),
    valid_until: z.string().datetime(),
    total_quota: z.number().int().positive().nullable(),
    per_order_limit: z.number().int().positive(),
    is_active: z.boolean(),
  })
  .superRefine((voucher, context) => {
    if (new Date(voucher.valid_until) <= new Date(voucher.valid_from)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valid_until'],
        message: 'Tanggal akhir harus setelah tanggal mulai.',
      });
    }
    if (voucher.type === 'percent' && voucher.value > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Persentase maksimal 100.',
      });
    }
  });

export type VoucherDraft = z.infer<typeof voucherSchema>;
