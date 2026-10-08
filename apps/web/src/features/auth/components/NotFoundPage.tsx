import { onMount, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { strings } from '../../../shared/strings';
import { sessionState } from '../../../shared/stores/session';
import { refreshShift, shiftState } from '../../../shared/stores/shift';

export function NotFoundPage() {
  const navigate = useNavigate();
  onMount(() => {
    createEffect(() => {
      if (!sessionState.loading) {
        if (!sessionState.userId) {
          navigate('/login', { replace: true });
        } else {
          void refreshShift().then(() =>
            navigate(shiftState.active ? '/pos' : '/shift', { replace: true })
          );
        }
      }
    });
  });
  return (
    <div class="route-loading" role="status">
      {strings.common.loading}
    </div>
  );
}
