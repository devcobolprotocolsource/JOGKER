import { Show } from 'solid-js';

export function KeyboardHint(props: { shortcut: string; label: string; disabled?: boolean }) {
  return (
    <Show when={!props.disabled}>
      <span class="keyboard-hint" title={`${props.label} (${props.shortcut})`}>
        <span>{props.label}</span>
        <kbd>{props.shortcut}</kbd>
      </span>
    </Show>
  );
}
