import { createSignal, onCleanup, onMount } from 'solid-js';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '../api/supabase';

export interface RealtimeSubscriptionOptions<T> {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { new: T; old: T }) => void;
  onDelete?: (payload: T) => void;
}

export function useRealtime<T extends Record<string, unknown> = Record<string, unknown>>(
  options: RealtimeSubscriptionOptions<T>
) {
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
        (payload: RealtimePostgresChangesPayload<T>) => {
          switch (payload.eventType) {
            case 'INSERT':
              options.onInsert?.(payload.new as T);
              break;
            case 'UPDATE':
              options.onUpdate?.({ new: payload.new as T, old: payload.old as T });
              break;
            case 'DELETE':
              options.onDelete?.(payload.old as T);
              break;
          }
        }
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
