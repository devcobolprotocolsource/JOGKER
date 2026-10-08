import { createEffect, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { sessionState } from '../../shared/stores/session';
import { ForbiddenPage } from '../../features/auth/guards/ForbiddenPage';

type Role = 'admin' | 'super_admin';

export function RequireRole(props: { roles: Role[]; children: JSX.Element }) {
  const navigate = useNavigate();
  const { roles, children } = props;

  onMount(() => {
    createEffect(() => {
      if (!sessionState.loading) {
        const userRole = sessionState.profile?.role;
        if (userRole && !roles.includes(userRole as Role)) {
          navigate('/403', { replace: true });
        }
      }
    });
  });

  if (sessionState.loading) {
    return (
      <div class="guard-loading" role="status" aria-live="polite">
        Memuat…
      </div>
    );
  }

  const userRole = sessionState.profile?.role;
  if (userRole && roles.includes(userRole as Role)) {
    return children;
  }

  return <ForbiddenPage />;
}
