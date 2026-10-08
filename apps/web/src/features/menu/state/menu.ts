import { createSignal } from 'solid-js';
import type { Category } from '../../pos/api/pos';
import type { MenuRecord } from '../api/menu';

const [categories, setCategories] = createSignal<Category[]>([]);
const [items, setItems] = createSignal<MenuRecord[]>([]);
const [selectedCategoryId, setSelectedCategoryId] = createSignal('');

export function setMenuData(nextCategories: Category[], nextItems: MenuRecord[]) {
  setCategories(nextCategories);
  setItems(nextItems);
  if (!selectedCategoryId() && nextCategories[0]) setSelectedCategoryId(nextCategories[0].id);
}

export { categories, items, selectedCategoryId, setSelectedCategoryId };
