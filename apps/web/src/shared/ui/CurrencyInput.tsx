import { createSignal, createEffect, Show, splitProps, untrack } from 'solid-js';
import type { JSX } from 'solid-js';
import { formatNumber } from '../lib/format';

export function CurrencyInput(
  props: {
    label: string;
    value: number;
    onValueChange: (value: number) => void;
    error?: string;
    id?: string;
  } & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onInput' | 'type'>
) {
  const [local, rest] = splitProps(props, ['label', 'value', 'onValueChange', 'error', 'id']);
  const [focused, setFocused] = createSignal(false);
  const [text, setText] = createSignal(untrack(() => String(local.value)));
  const id = untrack(() => local.id) ?? `currency-${Math.random().toString(36).slice(2, 9)}`;
  createEffect(() => {
    if (!focused()) setText(String(local.value));
  });
  function input(value: string) {
    const digits = value.replace(/\D/g, '');
    const number = digits ? Number(digits) : 0;
    if (Number.isSafeInteger(number)) {
      setText(digits);
      local.onValueChange(number);
    }
  }
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {local.label}
      </label>
      <input
        {...rest}
        id={id}
        class={`input input--currency ${local.error ? 'input--error' : ''}`}
        type="text"
        inputmode="numeric"
        autocomplete="off"
        value={focused() ? text() : formatNumber(local.value, 0)}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={local.error ? `${id}-error` : undefined}
        onFocus={() => {
          setFocused(true);
          setText(String(local.value));
        }}
        onInput={(event) => input(event.currentTarget.value)}
        onBlur={() => setFocused(false)}
      />
      <Show when={local.error}>
        <span id={`${id}-error`} class="field__message field__message--error" role="alert">
          {local.error}
        </span>
      </Show>
    </div>
  );
}
