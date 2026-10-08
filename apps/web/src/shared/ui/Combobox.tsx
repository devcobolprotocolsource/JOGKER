import { createMemo, createSignal, For, Show } from 'solid-js';
import { ChevronDown, Search } from 'lucide-solid';
import { strings } from '../strings';

export function Combobox(props: {
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = `combobox-${Math.random().toString(36).slice(2, 9)}`;
  const optionsId = `${id}-options`;
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const visible = createMemo(() =>
    props.options.filter((option) =>
      option.label
        .toLocaleLowerCase('id-ID')
        .includes(query().toLocaleLowerCase('id-ID')),
    ),
  );
  const selected = () =>
    props.options.find((option) => option.value === props.value);
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') setOpen(false);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }
  return (
    <div class="field combobox">
      <span class="field__label">{props.label}</span>
      <button
        class="input combobox__trigger"
        type="button"
        aria-label={props.label}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={optionsId}
        onClick={() => setOpen(!open())}
        onKeyDown={handleKeyDown}
      >
        <span>{selected()?.label ?? props.placeholder ?? props.label}</span>
        <ChevronDown size={18} aria-hidden={true} />
      </button>
      <Show when={open()}>
        <div class="combobox__popup">
          <label class="search-input">
            <span class="sr-only">{strings.sharedUi.filterOptions}</span>
            <Search size={18} aria-hidden={true} />
            <input
              id={id}
              role="combobox"
              aria-expanded="true"
              aria-controls={optionsId}
              aria-autocomplete="list"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <ul
            id={optionsId}
            class="combobox__options"
            role="listbox"
            aria-label={props.label}
          >
            <For each={visible()}>
              {(option) => (
                <li
                  role="option"
                  aria-selected={option.value === props.value}
                  aria-disabled={option.disabled || undefined}
                  onClick={() => {
                    if (!option.disabled) {
                      props.onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }
                  }}
                >
                  {option.label}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}
