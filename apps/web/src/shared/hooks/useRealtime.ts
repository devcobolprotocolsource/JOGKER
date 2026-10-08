import { createSignal, onCleanup, onMount } from 'solid-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../api/supabase';

export interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onChange?: () => void;
}

export function useRealtime(options: RealtimeSubscriptionOptions) {
  const [channel, setChannel] = createSignal<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);

  onMount(() => {
    const client = getSupabaseClient();
    const ch = client
      .channel(`realtime:${options.table}:${options.filter ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: options.event ?? '*',
          schema: 'public',
          table: options.table,
          filter: options.filter,
        },
        () => options.onChange?.()
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(ch);
  });

  onCleanup(() => {
    channel()?.unsubscribe();
  });

  return { isConnected };
}
