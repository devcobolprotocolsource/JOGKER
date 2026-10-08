import { For } from 'solid-js';

export function RadioGroup(props: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <fieldset class="radio-group">
      <legend class="field__label">{props.label}</legend>
      <div class={`radio-group__options radio-group__options--${props.orientation ?? 'vertical'}`}>
        <For each={props.options}>
          {(option) => (
            <label class="radio-control">
              <input
                type="radio"
                name={props.name}
                value={option.value}
                checked={props.value === option.value}
                disabled={option.disabled}
                onChange={() => props.onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          )}
        </For>
      </div>
    </fieldset>
  );
}
