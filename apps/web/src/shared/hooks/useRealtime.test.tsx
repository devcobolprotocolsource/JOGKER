import { render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const realtime = vi.hoisted(() => ({
  change: undefined as (() => void) | undefined,
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('../api/supabase', () => ({
  getSupabaseClient: () => ({
    channel: () => {
      const channel = {
        on: (...args: unknown[]) => {
          realtime.on(...args);
          realtime.change = args[2] as (() => void) | undefined;
          return channel;
        },
        subscribe: () => {
          realtime.subscribe();
          return channel;
        },
        unsubscribe: () => realtime.unsubscribe(),
      };
      return channel;
    },
  }),
}));

import { useRealtime } from './useRealtime';

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtime.change = undefined;
  });

  it('subscribes to changes and unsubscribes when the owner is disposed', async () => {
    const onChange = vi.fn();
    function RealtimeOwner() {
      useRealtime({ table: 'orders', filter: 'status=eq.new', onChange });
      return <div>orders</div>;
    }

    const view = render(() => <RealtimeOwner />);

    await waitFor(() => expect(realtime.subscribe).toHaveBeenCalledOnce());
    expect(realtime.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.new',
      },
      expect.any(Function)
    );

    realtime.change?.();
    expect(onChange).toHaveBeenCalledOnce();

    view.unmount();
    expect(realtime.unsubscribe).toHaveBeenCalledOnce();
  });
});
