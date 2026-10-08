import { z } from 'zod';

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
