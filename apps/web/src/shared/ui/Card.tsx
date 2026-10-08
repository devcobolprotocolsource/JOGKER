import type { JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';

export function Card(props: { children: JSX.Element; class?: string; as?: 'section' | 'article' }) {
  return (
    <Dynamic component={props.as ?? 'section'} class={`surface-card ${props.class ?? ''}`}>
      {props.children}
    </Dynamic>
  );
}
