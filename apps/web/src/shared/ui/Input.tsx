import type { Component } from 'solid-js';
import type { JSX } from 'solid-js';
import { Show, splitProps, untrack } from 'solid-js';
import { Dynamic } from 'solid-js/web';

export function Input(
  props: {
    label: string;
    error?: string;
    hint?: string;
    icon?: Component<{ size?: number; 'aria-hidden'?: boolean }>;
    class?: string;
  } & JSX.InputHTMLAttributes<HTMLInputElement>,
) {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'icon',
    'class',
    'id',
  ]);
  const id =
    untrack(() => local.id) ??
    `input-${Math.random().toString(36).slice(2, 9)}`;
  const messageId = `${id}-message`;
  return (
    <div class={`field ${local.class ?? ''}`}>
      <label class="field__label" for={id}>
        {local.label}
      </label>
      <div class="field__control">
        <Show when={local.icon}>
          <span class="field__icon" aria-hidden="true">
            <Dynamic component={local.icon} size={18} aria-hidden={true} />
          </span>
        </Show>
        <input
          {...rest}
          id={id}
          class={`input ${local.icon ? 'input--icon' : ''} ${local.error ? 'input--error' : ''}`}
          aria-invalid={local.error ? 'true' : undefined}
          aria-describedby={local.error || local.hint ? messageId : undefined}
        />
      </div>
      <Show when={local.error || local.hint}>
        <span
          id={messageId}
          class={`field__message ${local.error ? 'field__message--error' : ''}`}
          role={local.error ? 'alert' : undefined}
        >
          {local.error ?? local.hint}
        </span>
      </Show>
    </div>
  );
}
