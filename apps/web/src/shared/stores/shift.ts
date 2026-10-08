import { createStore } from 'solid-js/store';
import { getSupabaseClient } from '../api/supabase';
import { capture } from '../api/result';

export interface ActiveShift {
  id: string;
  status: 'open' | 'closed';
  opened_at: string;
  opening_cash: number;
}

const [shiftState, setShiftState] = createStore<{
  loading: boolean;
  active: ActiveShift | null;
}>({
  loading: false,
  active: null,
});

export async function refreshShift(): Promise<void> {
  setShiftState('loading', true);
  try {
    const { data, error } = await getSupabaseClient()
      .from('shifts')
      .select('id, status, opened_at, opening_cash')
      .eq('status', 'open')
      .maybeSingle();
    if (error) throw error;
    setShiftState({ loading: false, active: data as ActiveShift | null });
  } catch {
    setShiftState({ loading: false, active: null });
  }
}

export async function openShift(openingCash: number) {
  const result = await capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('open_shift', {
      p_opening_cash: openingCash,
    });
    if (error) throw error;
    await refreshShift();
    return data;
  });
  return result;
}

export async function closeShift(actualCash: number, note?: string) {
  const result = await capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('close_shift', {
      p_actual_cash: actualCash,
      p_note: note ?? null,
    });
    if (error) throw error;
    await refreshShift();
    return data;
  });
  return result;
}

export { shiftState };
