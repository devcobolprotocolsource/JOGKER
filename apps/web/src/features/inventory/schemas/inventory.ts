import { z } from 'zod';

export const inventoryItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(20),
  min_qty: z.number().nonnegative(),
  unit_cost: z.number().int().nonnegative(),
  is_active: z.boolean(),
});

export const stockMovementSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(['purchase', 'waste']),
  quantity: z.number().positive(),
  note: z.string().trim().max(500).optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
