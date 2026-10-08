import type { JSX } from 'solid-js';
import type { Component } from 'solid-js';
import { Button } from './Button';

export function IconButton(props: {
  label: string;
  icon: Component<{ size?: number; 'aria-hidden'?: boolean }>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
}) {
  return (
    <Button
      class="icon-button"
      variant={props.variant ?? 'ghost'}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <props.icon size={20} aria-hidden={true} />
    </Button>
  );
}
