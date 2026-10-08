import { createEffect, onCleanup, Show, untrack } from 'solid-js';
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-solid';
import { Dynamic } from 'solid-js/web';
import { strings } from '../strings';

export function Toast(props: {
  open: boolean;
  title: string;
  message?: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}) {
  const icons = {
    success: Check,
    error: CircleAlert,
    info: Info,
    warning: TriangleAlert,
  };
  const variant = () => props.variant ?? 'info';
  const closeToast = untrack(() => props.onClose);
  createEffect(() => {
    if (!props.open || variant() === 'error') return;
    const timer = window.setTimeout(closeToast, 4000);
    onCleanup(() => window.clearTimeout(timer));
  });
  return (
    <Show when={props.open}>
      <div
        class={`toast toast--${variant()}`}
        role={variant() === 'error' ? 'alert' : 'status'}
        aria-live={variant() === 'error' ? 'assertive' : 'polite'}
      >
        <Dynamic component={icons[variant()]} size={20} aria-hidden={true} />
        <div>
          <strong>{props.title}</strong>
          <Show when={props.message}>
            <p>{props.message}</p>
          </Show>
        </div>
        <button
          type="button"
          aria-label={strings.sharedUi.closeNotification}
          onClick={() => props.onClose()}
        >
          <X size={18} aria-hidden={true} />
        </button>
      </div>
    </Show>
  );
}
