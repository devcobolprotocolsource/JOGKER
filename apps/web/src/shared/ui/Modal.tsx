import type { JSX } from 'solid-js';
import { createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { strings } from '../strings';

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  children: JSX.Element;
}) {
  let dialog: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | null = null;
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.closeOnEscape !== false) {
      event.preventDefault();
      props.onClose();
    }
    if (event.key !== 'Tab' || !dialog) return;
    const elements = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const first = elements[0];
    const last = elements.at(-1);
    if (!elements.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      first?.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
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
    queueMicrotask(() =>
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus(),
    );
    onCleanup(() => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    });
  });
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            props.closeOnBackdrop !== false &&
            props.onClose()
          }
        >
          <div
            ref={dialog}
            class={`modal modal--${props.size ?? 'md'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header class="modal__header">
              <h2 id={titleId}>{props.title}</h2>
              <button
                class="modal__close"
                type="button"
                aria-label={strings.sharedUi.close}
                onClick={() => props.onClose()}
              >
                ×
              </button>
            </header>
            <div class="modal__body">{props.children}</div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
