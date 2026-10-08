import type { JSX } from 'solid-js';
import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

export function EmptyState(props: {
  icon: Component<{ size?: number; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action?: JSX.Element;
}) {
  return (
    <div class="empty-state">
      <Dynamic component={props.icon} size={32} aria-hidden={true} />
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      {props.action}
    </div>
  );
}
