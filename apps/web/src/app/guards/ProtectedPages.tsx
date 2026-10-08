import { Show, type JSX } from 'solid-js';
import type { Role } from '../../shared/stores/session';
import { RequireAuth } from '../../features/auth/guards/RequireAuth';
import { RequireRole } from '../../features/auth/guards/RequireRole';

export function ProtectedPage(props: { allow?: Role[]; children: JSX.Element }) {
  return (
    <RequireAuth>
      <Show when={props.allow} fallback={props.children}>
        <RequireRole allow={props.allow!}>{props.children}</RequireRole>
      </Show>
    </RequireAuth>
  );
}
