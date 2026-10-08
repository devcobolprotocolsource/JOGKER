import type { JSX } from 'solid-js';
import { createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { strings } from '../strings';

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Drawer(props: {
  open: boolean;
  title: string;
  side?: 'right' | 'bottom';
  onClose: () => void;
  children: JSX.Element;
}) {
  let drawer: HTMLElement | undefined;
  let previousFocus: HTMLElement | null = null;
  const titleId = `drawer-title-${Math.random().toString(36).slice(2, 9)}`;
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      props.onClose();
      return;
    }
    if (event.key !== 'Tab' || !drawer) return;
    const elements = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector));
    const first = elements[0];
    const last = elements.at(-1);
    if (!elements.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      first?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  createEffect(() => {
    if (!props.open) return;
    previousFocus = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => drawer?.querySelector<HTMLElement>(focusableSelector)?.focus());
    onCleanup(() => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    });
  });
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="drawer-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}
        >
          <aside
            ref={drawer}
            class={`drawer drawer--${props.side ?? 'right'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header class="drawer__header">
              <h2 id={titleId}>{props.title}</h2>
              <button
                class="icon-button"
                type="button"
                aria-label={strings.sharedUi.closePanel}
                onClick={() => props.onClose()}
              >
                ×
              </button>
            </header>
            <div class="drawer__body">{props.children}</div>
          </aside>
        </div>
      </Portal>
    </Show>
  );
}
