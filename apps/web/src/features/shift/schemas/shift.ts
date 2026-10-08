import { z } from 'zod';

export const openingCashSchema = z.object({
  openingCash: z.number().int().nonnegative(),
});
export const closingCashSchema = z.object({
  actualCash: z.number().int().nonnegative(),
  note: z.string().trim().max(500).optional(),
});

export type OpeningCashInput = z.infer<typeof openingCashSchema>;
export type ClosingCashInput = z.infer<typeof closingCashSchema>;
