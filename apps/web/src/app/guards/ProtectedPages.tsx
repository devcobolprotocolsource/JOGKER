import type { JSX } from 'solid-js';
import type { Role } from '../../shared/stores/session';
import { RequireAuth, RequireRole } from '../../features/auth';

export function ProtectedPage(props: {
  allow?: Role[];
  children: JSX.Element;
}) {
  return (
    <RequireAuth>
      {props.allow ? (
        <RequireRole allow={props.allow}>{props.children}</RequireRole>
      ) : (
        props.children
      )}
    </RequireAuth>
  );
}
