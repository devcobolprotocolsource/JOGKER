import type { JSX } from 'solid-js';

export function Badge(props: {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: JSX.Element;
}) {
  return <span class={`badge badge--${props.variant ?? 'neutral'}`}>{props.children}</span>;
}
