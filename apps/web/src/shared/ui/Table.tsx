import type { JSX } from 'solid-js';

export function Table(props: { caption: string; children: JSX.Element; class?: string }) {
  return (
    <div class="table-scroll">
      <table class={`data-table ${props.class ?? ''}`}>
        <caption class="sr-only">{props.caption}</caption>
        {props.children}
      </table>
    </div>
  );
}
