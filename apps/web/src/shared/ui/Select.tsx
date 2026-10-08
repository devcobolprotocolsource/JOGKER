import type { JSX } from 'solid-js';
import { For, Show, splitProps, untrack } from 'solid-js';

export function Select(
  props: {
    label: string;
    options: { value: string; label: string; disabled?: boolean }[];
    error?: string;
    id?: string;
  } & JSX.SelectHTMLAttributes<HTMLSelectElement>
) {
  const [local, rest] = splitProps(props, ['label', 'options', 'error', 'id', 'class']);
  const id = untrack(() => local.id) ?? `select-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {local.label}
      </label>
      <select
        {...rest}
        id={id}
        class={`input select ${local.class ?? ''} ${local.error ? 'input--error' : ''}`}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={local.error ? `${id}-error` : undefined}
      >
        <For each={local.options}>
          {(option) => (
            <option value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          )}
        </For>
      </select>
      <Show when={local.error}>
        <span id={`${id}-error`} class="field__message field__message--error" role="alert">
          {local.error}
        </span>
      </Show>
    </div>
  );
}
