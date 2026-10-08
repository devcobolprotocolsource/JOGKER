import { Show, type JSX } from 'solid-js';
import type { Role } from '../../../shared/stores/session';
import { sessionState } from '../../../shared/stores/session';
import { ForbiddenPage } from './ForbiddenPage';

export function RequireRole(props: { allow: Role[]; children: JSX.Element }) {
  return (
    <Show
      when={sessionState.profile && props.allow.includes(sessionState.profile.role)}
      fallback={<ForbiddenPage />}
    >
      {props.children}
    </Show>
  );
}
