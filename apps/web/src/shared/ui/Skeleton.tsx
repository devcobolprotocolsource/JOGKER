import { strings } from '../strings';

export function Skeleton(props: {
  rows?: number;
  class?: string;
  label?: string;
}) {
  return (
    <div
      class={`skeleton-group ${props.class ?? ''}`}
      role="status"
      aria-label={props.label ?? strings.sharedUi.loadingData}
    >
      {Array.from({ length: props.rows ?? 3 }, (_, index) => (
        <span class="skeleton" style={{ '--skeleton-index': index }} />
      ))}
    </div>
  );
}
