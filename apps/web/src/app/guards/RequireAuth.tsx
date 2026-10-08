import { createEffect, onMount } from 'solid-js';
import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { sessionState } from '../../shared/stores/session';
import { strings } from '../../shared/strings';

export function RequireAuth(props: { children: JSX.Element }) {
  const navigate = useNavigate();

  onMount(() => {
    createEffect(() => {
      if (!sessionState.loading) {
        if (!sessionState.userId) {
          navigate('/login', { replace: true });
        }
      }
    });
  });

  return (
    <Show
      when={sessionState.userId}
      fallback={
        <div class="guard-loading" role="status" aria-live="polite">
          {strings.common.loading}
        </div>
      }
    >
      {props.children}
    </Show>
  );
}
