import { For, Show, createMemo, createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-solid';
import { Dynamic } from 'solid-js/web';
import { strings } from '../strings';

export interface DataTableColumn<Row> {
  key: string;
  label: string;
  value: (row: Row) => string | number;
  render?: (row: Row) => JSX.Element;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<Row>(props: {
  caption: string;
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
}) {
  const [sortKey, setSortKey] = createSignal('');
  const [descending, setDescending] = createSignal(false);
  const sorted = () => {
    const key = sortKey();
    if (!key) return props.rows;
    const column = props.columns.find((candidate) => candidate.key === key);
    if (!column) return props.rows;
    const isDescending = descending();
    return [...props.rows].sort((left, right) => {
      const first = column.value(left);
      const second = column.value(right);
      const result =
        typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second), 'id-ID');
      return isDescending ? -result : result;
    });
  };
  const allSelected = createMemo(
    () =>
      props.rows.length > 0 &&
      props.rows.every((row) =>
        props.selectedKeys?.includes(props.rowKey(row)),
      ),
  );
  function selectAll(checked: boolean) {
    props.onSelectionChange?.(checked ? props.rows.map(props.rowKey) : []);
  }
  function toggleRow(key: string, checked: boolean) {
    const selected = new Set(props.selectedKeys ?? []);
    if (checked) selected.add(key);
    else selected.delete(key);
    props.onSelectionChange?.([...selected]);
  }
  function sort(key: string) {
    if (sortKey() === key) setDescending(!descending());
    else {
      setSortKey(key);
      setDescending(false);
    }
  }
  return (
    <div class="table-scroll">
      <table class="data-table">
        <caption class="sr-only">{props.caption}</caption>
        <thead>
          <tr>
            <Show when={props.onSelectionChange}>
              <th scope="col">
                <input
                  type="checkbox"
                  aria-label={strings.sharedUi.selectAllRows}
                  checked={allSelected()}
                  onChange={(event) => selectAll(event.currentTarget.checked)}
                />
              </th>
            </Show>
            <For each={props.columns}>
              {(column) => (
                <th
                  scope="col"
                  aria-sort={
                    sortKey() === column.key
                      ? descending()
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                >
                  <Show when={column.sortable} fallback={column.label}>
                    <button
                      class="table-sort"
                      type="button"
                      onClick={() => sort(column.key)}
                    >
                      {column.label}
                      <Dynamic
                        component={
                          sortKey() !== column.key
                            ? ArrowUpDown
                            : descending()
                              ? ArrowDown
                              : ArrowUp
                        }
                        size={16}
                        aria-hidden={true}
                      />
                    </button>
                  </Show>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={sorted()}>
            {(row) => (
              <tr>
                <Show when={props.onSelectionChange}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={strings.sharedUi.selectRow.replace(
                        '{id}',
                        props.rowKey(row),
                      )}
                      checked={
                        props.selectedKeys?.includes(props.rowKey(row)) ?? false
                      }
                      onChange={(event) =>
                        toggleRow(
                          props.rowKey(row),
                          event.currentTarget.checked,
                        )
                      }
                    />
                  </td>
                </Show>
                <For each={props.columns}>
                  {(column) => (
                    <td
                      data-label={column.label}
                      class={`data-table__cell--${column.align ?? 'left'}`}
                    >
                      {column.render
                        ? column.render(row)
                        : String(column.value(row))}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
