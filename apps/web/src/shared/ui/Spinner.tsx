export function Spinner(props: { size?: 'sm' | 'md'; label: string }) {
  return (
    <span class={`spinner spinner--${props.size ?? 'md'}`} role="status">
      <span class="sr-only">{props.label}</span>
    </span>
  );
}
