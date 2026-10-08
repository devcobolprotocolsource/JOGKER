import { ChevronLeft, ChevronRight } from 'lucide-solid';
import { For } from 'solid-js';
import { strings } from '../strings';

export function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
}) {
  const pages = () => Math.max(1, Math.ceil(props.total / props.pageSize));
  const start = () =>
    props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const end = () => Math.min(props.page * props.pageSize, props.total);
  return (
    <nav class="pagination" aria-label={strings.sharedUi.pageNavigation}>
      <span>
        {strings.sharedUi.rowsOf
          .replace('{start}', String(start()))
          .replace('{end}', String(end()))
          .replace('{total}', String(props.total))}
      </span>
      {props.onPageSizeChange && (
        <label>
          {strings.sharedUi.rows}
          <select
            class="input pagination__size"
            value={props.pageSize}
            onChange={(event) =>
              props.onPageSizeChange?.(Number(event.currentTarget.value))
            }
          >
            <For each={props.pageSizes ?? [25, 50, 100]}>
              {(size) => <option value={size}>{size}</option>}
            </For>
          </select>
        </label>
      )}
      <button
        type="button"
        aria-label={strings.sharedUi.previousPage}
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
      >
        <ChevronLeft size={18} aria-hidden={true} />
      </button>
      <span aria-current="page">
        {strings.sharedUi.pageOf
          .replace('{page}', String(props.page))
          .replace('{total}', String(pages()))}
      </span>
      <button
        type="button"
        aria-label={strings.sharedUi.nextPage}
        disabled={props.page >= pages()}
        onClick={() => props.onPageChange(Math.min(pages(), props.page + 1))}
      >
        <ChevronRight size={18} aria-hidden={true} />
      </button>
    </nav>
  );
}
