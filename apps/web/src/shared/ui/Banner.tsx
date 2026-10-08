import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { CircleAlert, Info, TriangleAlert } from 'lucide-solid';
import { Dynamic } from 'solid-js/web';

export function Banner(props: {
  variant: 'info' | 'warning' | 'danger';
  children: JSX.Element;
  active?: boolean;
}) {
  const icon = () =>
    props.variant === 'info' ? Info : props.variant === 'warning' ? TriangleAlert : CircleAlert;
  return (
    <Show when={props.active !== false}>
      <div
        class={`banner banner--${props.variant}`}
        role={props.variant === 'danger' ? 'alert' : 'status'}
      >
        <Dynamic component={icon()} size={20} aria-hidden={true} />
        <div>{props.children}</div>
      </div>
    </Show>
  );
}
