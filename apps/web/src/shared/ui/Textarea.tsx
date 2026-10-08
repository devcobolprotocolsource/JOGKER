import type { JSX } from 'solid-js';
import { Show, splitProps, untrack } from 'solid-js';

export function Textarea(
  props: {
    label: string;
    value?: string;
    maxLength?: number;
    error?: string;
    id?: string;
  } & JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const [local, rest] = splitProps(props, [
    'label',
    'value',
    'maxLength',
    'error',
    'id',
    'class',
  ]);
  const id =
    untrack(() => local.id) ??
    `textarea-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {local.label}
      </label>
      <textarea
        {...rest}
        id={id}
        class={`input textarea ${local.class ?? ''} ${local.error ? 'input--error' : ''}`}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={local.error ? `${id}-error` : undefined}
      />
      <div class="field__bottom">
        <Show when={local.error}>
          <span
            id={`${id}-error`}
            class="field__message field__message--error"
            role="alert"
          >
            {local.error}
          </span>
        </Show>
        <Show when={local.maxLength}>
          <span class="field__count">
            {(local.value ?? '').length}/{local.maxLength}
          </span>
        </Show>
      </div>
    </div>
  );
}
