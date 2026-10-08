import { Navigate, useLocation } from '@solidjs/router';
import { Show, type JSX } from 'solid-js';
import { sessionState } from '../../../shared/stores/session';
import { strings } from '../../../shared/strings';

export function RequireAuth(props: { children: JSX.Element }) {
  const location = useLocation();
  return (
    <Show
      when={!sessionState.loading}
      fallback={
        <p class="route-loading" role="status" aria-live="polite">
          {strings.common.loading}
        </p>
      }
    >
      <Show
        when={sessionState.userId}
        fallback={<Navigate href="/login" state={{ from: location.pathname }} />}
      >
        {props.children}
      </Show>
    </Show>
  );
}
