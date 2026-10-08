import { z } from 'zod';

export const checkoutSchema = z
  .object({
    method: z.enum(['cash', 'transfer', 'ewallet', 'split']),
    amountReceived: z.number().int().nonnegative(),
    cashPart: z.number().int().nonnegative(),
    paymentAccountId: z.string().uuid().optional(),
    referenceNo: z.string().trim().max(120).optional(),
  })
  .superRefine((value, context) => {
    if ((value.method === 'transfer' || value.method === 'ewallet') && !value.paymentAccountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentAccountId'],
        message: 'Pilih rekening pembayaran.',
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
