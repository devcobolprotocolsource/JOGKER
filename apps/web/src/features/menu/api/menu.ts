import { capture } from '../../../shared/api/result';
import { getSupabaseClient } from '../../../shared/api/supabase';
import type { Category } from '../../pos/api/pos';
import type { MenuItemInput } from '../schemas/menu';

export interface MenuRecord extends MenuItemInput {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean;
  is_active: boolean;
  sort_order: number;
}

export async function loadMenu() {
  return capture(async () => {
    const client = getSupabaseClient();
    const [categories, items] = await Promise.all([
      client.from('categories').select('id, name, sort_order, is_active').order('sort_order'),
      client
        .from('menu_items')
        .select(
          'id, category_id, name, description, price, image_path, is_available, is_active, sort_order'
        )
        .order('sort_order'),
    ]);
    if (categories.error) throw categories.error;
    if (items.error) throw items.error;
    return {
      categories: categories.data as Category[],
      items: items.data as MenuRecord[],
    };
  });
}

export async function saveCategory(name: string, sortOrder: number) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('upsert_category', {
      p_id: null,
      p_name: name,
      p_sort_order: sortOrder,
      p_is_active: true,
    });
    if (error) throw error;
    return data;
  });
}

export async function saveMenuItem(input: MenuItemInput) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('upsert_menu_item', {
      p_item: input,
    });
    if (error) throw error;
    return data;
  });
}

export async function setItemAvailable(id: string, available: boolean) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('set_menu_item_available', {
      p_item_id: id,
      p_is_available: available,
    });
    if (error) throw error;
    return data;
  });
}

export async function softDeleteMenuItem(item: MenuRecord) {
  return saveMenuItem({
    ...item,
    is_active: false,
  });
}
