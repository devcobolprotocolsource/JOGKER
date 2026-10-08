import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sort_order: z.number().int().nonnegative(),
});
export const menuItemSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  price: z.number().int().nonnegative(),
  image_path: z.string().nullable().optional(),
  is_available: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  recipe_lines: z
    .array(
      z.object({
        inventory_item_id: z.string().uuid(),
        qty_per_serving: z.number().positive(),
      })
    )
    .optional(),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;
