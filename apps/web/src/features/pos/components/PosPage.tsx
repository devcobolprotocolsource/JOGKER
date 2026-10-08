import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ArrowRight, Coffee } from 'lucide-solid';
import { shiftState } from '../../../shared/stores/shift';
import { strings } from '../../../shared/strings';

export function PosPage() {
  const navigate = useNavigate();
  return (
    <main class="pos-entry">
      <Show
        when={shiftState.active}
        fallback={
          <section class="pos-empty">
            <Coffee size={28} aria-hidden="true" />
            <h1>{strings.pos.title}</h1>
            <p>{strings.pos.noShift}</p>
            <button
              class="button button--primary"
              type="button"
              onClick={() => navigate('/shift')}
            >
              {strings.pos.openShift}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        }
      >
        <section class="pos-empty">
          <Coffee size={28} aria-hidden="true" />
          <h1>{strings.pos.title}</h1>
          <p>{strings.pos.loading}</p>
        </section>
      </Show>
    </main>
  );
}
