import { createEffect, createSignal, For } from 'solid-js';

export function Tabs(props: {
  label: string;
  value: string;
  tabs: { value: string; label: string; count?: number; disabled?: boolean }[];
  onChange: (value: string) => void;
}) {
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const tabButtons: HTMLButtonElement[] = [];
  createEffect(() => {
    const index = props.tabs.findIndex((tab) => tab.value === props.value);
    if (index >= 0) setFocusedIndex(index);
  });
  function moveFocus(event: KeyboardEvent, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? props.tabs.length - 1
          : (index +
              (event.key === 'ArrowRight' ? 1 : -1) +
              props.tabs.length) %
            props.tabs.length;
    setFocusedIndex(next);
    tabButtons[next]?.focus();
    if (!props.tabs[next]?.disabled) props.onChange(props.tabs[next]!.value);
  }
  return (
    <div class="tabs" role="tablist" aria-label={props.label}>
      <For each={props.tabs}>
        {(tab, index) => (
          <button
            ref={(element) => (tabButtons[index()] = element)}
            type="button"
            role="tab"
            aria-selected={props.value === tab.value}
            tabIndex={focusedIndex() === index() ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => props.onChange(tab.value)}
            onKeyDown={(event) => moveFocus(event, index())}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span class="tab-count">{tab.count}</span>
            )}
          </button>
        )}
      </For>
    </div>
  );
}
