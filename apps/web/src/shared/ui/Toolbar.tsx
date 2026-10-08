import { splitProps } from 'solid-js';
import type { JSX } from 'solid-js';

export function Toolbar(props: { children: JSX.Element; class?: string; gap?: number }) {
  const [local, rest] = splitProps(props, ['children', 'class', 'gap']);
  return (
    <div
      {...rest}
      class={`toolbar ${local.class ?? ''}`}
      style={{ gap: local.gap ? `${local.gap}px` : undefined }}
    >
      {local.children}
    </div>
  );
}
