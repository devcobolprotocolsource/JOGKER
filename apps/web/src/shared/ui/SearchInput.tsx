import { createSignal, onCleanup, Show, untrack } from 'solid-js';
import { Search, X } from 'lucide-solid';
import { strings } from '../strings';

export function SearchInput(props: {
  label: string;
  placeholder?: string;
  value?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}) {
  const [value, setValue] = createSignal(untrack(() => props.value ?? ''));
  const onSearch = untrack(() => props.onSearch);
  const debounceMs = untrack(() => props.debounceMs);
  let timer: number | undefined;
  onCleanup(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
  return (
    <label class="search-input">
      <span class="sr-only">{props.label}</span>
      <Search size={18} aria-hidden={true} />
      <input
        type="search"
        value={value()}
        placeholder={props.placeholder ?? props.label}
        onInput={(event) => {
          const nextValue = event.currentTarget.value;
          setValue(nextValue);
          if (timer !== undefined) window.clearTimeout(timer);
          timer = window.setTimeout(() => onSearch(nextValue.trim()), debounceMs ?? 250);
        }}
      />
      <Show when={value()}>
        <button
          type="button"
          aria-label={strings.sharedUi.clearSearch}
          onClick={() => {
            setValue('');
            if (timer !== undefined) window.clearTimeout(timer);
            timer = window.setTimeout(() => onSearch(''), debounceMs ?? 250);
          }}
        >
          <X size={18} aria-hidden={true} />
        </button>
      </Show>
    </label>
  );
}
