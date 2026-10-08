import { createStore } from 'solid-js/store';
import { getSupabaseClient } from '../api/supabase';

export interface StoreSettings {
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_path: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  tax_percent: number;
  service_percent: number;
  rounding_rule: 'none' | 'up_100' | 'nearest_100';
  paper_width_mm: 58 | 80;
  require_verified_payment_before_complete: boolean;
  allow_negative_stock: boolean;
}

const [settingsState, setSettingsState] = createStore<{
  loading: boolean;
  value: StoreSettings | null;
}>({
  loading: false,
  value: null,
});

export async function refreshSettings(): Promise<void> {
  setSettingsState('loading', true);
  try {
    const { data, error } = await getSupabaseClient()
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    setSettingsState({ loading: false, value: data as StoreSettings });
  } catch {
    setSettingsState({ loading: false, value: null });
  }
}

export async function saveSettings(value: Partial<StoreSettings>) {
  const { data, error } = await getSupabaseClient().rpc('update_store_settings', {
    p_settings: value,
  });
  if (error) return { ok: false as const, error };
  setSettingsState('value', data as StoreSettings);
  return { ok: true as const, data };
}

export { settingsState };
