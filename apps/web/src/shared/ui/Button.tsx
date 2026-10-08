import type { JSX } from 'solid-js';
import { Show, splitProps } from 'solid-js';
import { strings } from '../strings';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: JSX.Element;
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'loading',
    'children',
    'class',
  ]);
  return (
    <button
      {...rest}
      class={`button button--${local.variant ?? 'primary'} button--${local.size ?? 'md'} ${local.class ?? ''}`}
      aria-busy={local.loading ? 'true' : undefined}
      disabled={local.loading || props.disabled}
    >
      <span
        class={`button__content ${local.loading ? 'button__content--hidden' : ''}`}
      >
        {local.children}
      </span>
      <Show when={local.loading}>
        <span class="button__loading">
          <span class="spinner spinner--sm" aria-hidden="true" />
          {strings.sharedUi.processing}
        </span>
      </Show>
    </button>
  );
}
