import { splitProps, Show } from 'solid-js';
import type { JSX } from 'solid-js';

export function TextButton(
  props: {
    children: JSX.Element;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    class?: string;
    type?: 'button' | 'submit' | 'reset';
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'>
) {
  const [local, rest] = splitProps(props, [
    'children',
    'variant',
    'disabled',
    'loading',
    'onClick',
    'class',
    'type',
  ]);
  return (
    <button
      {...rest}
      type={local.type ?? 'button'}
      class={`text-button text-button--${local.variant ?? 'default'} ${local.class ?? ''} ${local.disabled ? 'text-button--disabled' : ''}`}
      disabled={local.disabled ?? false}
      onClick={(e) => local.onClick?.(e)}
    >
      <Show when={local.loading} fallback={local.children}>
        <span class="text-button__spinner" />
      </Show>
    </button>
  );
}
