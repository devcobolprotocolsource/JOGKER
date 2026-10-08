import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { Check, Filter } from 'lucide-solid';
import { Button, Card, Checkbox, Input, Modal, Table } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import {
  loadOpname,
  saveOpnameCount,
  finalizeOpname,
  type OpnameLine,
  type OpnameRecord,
} from '../api/inventory';
import { formatNumber } from '../../../shared/lib/format';

export function StockOpnameDetailPage() {
  const params = useParams<{ id: string }>();
  const [opname, setOpname] = createSignal<OpnameRecord | null>(null);
  const [lines, setLines] = createSignal<OpnameLine[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [savingIds, setSavingIds] = createSignal<string[]>([]);
  const [onlyDifference, setOnlyDifference] = createSignal(false);
  const [notCountedOnly, setNotCountedOnly] = createSignal(false);
  const [finalizeOpen, setFinalizeOpen] = createSignal(false);
  const [confirmText, setConfirmText] = createSignal('');
  const [finalizing, setFinalizing] = createSignal(false);
  const timers = new Map<string, number>();
  const visibleLines = createMemo(() =>
    lines().filter((line) => {
      if (onlyDifference() && (line.counted_qty === null || line.counted_qty === line.system_qty))
        return false;
      if (notCountedOnly() && line.counted_qty !== null) return false;
      return true;
    })
  );

  async function refresh() {
    const result = await loadOpname(params.id);
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setOpname(result.data.opname);
    setLines(result.data.lines);
    setLoading(false);
  }
  onMount(() => void refresh());
  onCleanup(() => {
    for (const timer of timers.values()) window.clearTimeout(timer);
  });

  function updateCount(line: OpnameLine, raw: string) {
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
    setLines((current) =>
      current.map((candidate) =>
        candidate.inventory_item_id === line.inventory_item_id
          ? { ...candidate, counted_qty: value }
          : candidate
      )
    );
    const previous = timers.get(line.inventory_item_id);
    if (previous !== undefined) window.clearTimeout(previous);
    setSavingIds((current) =>
      current.includes(line.inventory_item_id) ? current : [...current, line.inventory_item_id]
    );
    const timer = window.setTimeout(() => {
      void (async () => {
        if (value === null) return;
        const result = await saveOpnameCount(params.id, line.inventory_item_id, value);
        if (!result.ok) setError(result.error.message);
        setSavingIds((current) => current.filter((id) => id !== line.inventory_item_id));
        timers.delete(line.inventory_item_id);
      })();
    }, 400);
    timers.set(line.inventory_item_id, timer);
  }

  async function finalize() {
    if (confirmText() !== 'FINALISASI') return;
    setFinalizing(true);
    const result = await finalizeOpname(params.id);
    setFinalizing(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setFinalizeOpen(false);
    setConfirmText('');
    await refresh();
  }

  const incomplete = () => lines().some((line) => line.counted_qty === null);
  const differenceCount = () =>
    lines().filter((line) => line.counted_qty !== null && line.counted_qty !== line.system_qty)
      .length;
  return (
    <main class="opname-detail page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">
            <A href="/inventory/opname">{strings.stockOpname.title}</A>
          </p>
          <h1>{formatDateTime(opname()?.opened_at)}</h1>
        </div>
        <Show when={opname()?.status === 'draft'}>
          <Button variant="primary" disabled={incomplete()} onClick={() => setFinalizeOpen(true)}>
            {strings.stockOpname.finalizeTitle} · {differenceCount()}
          </Button>
        </Show>
      </header>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <Show when={opname()?.status === 'finalized'}>
          <div class="banner banner--info">
            <Check size={18} aria-hidden={true} />
            {strings.stockOpname.finalizedBanner}
          </div>
        </Show>
        <div class="opname-filters">
          <Checkbox
            label={strings.stockOpname.onlyDifferences}
            checked={onlyDifference()}
            onChange={setOnlyDifference}
          />
          <Checkbox
            label={strings.stockOpname.notCounted}
            checked={notCountedOnly()}
            onChange={setNotCountedOnly}
          />
          <span>
            <Filter size={16} aria-hidden={true} />
            {differenceCount()} {strings.stockOpname.difference.toLocaleLowerCase('id-ID')}
          </span>
        </div>
        <Card class="opname-table-wrap">
          <Table caption={strings.stockOpname.title}>
            <thead>
              <tr>
                <th scope="col">{strings.inventory.name}</th>
                <th scope="col">{strings.stockOpname.systemQty}</th>
                <th scope="col">{strings.stockOpname.countedQty}</th>
                <th scope="col">{strings.stockOpname.difference}</th>
                <th scope="col">{strings.sharedUi.saveState}</th>
              </tr>
            </thead>
            <tbody>
              <For each={visibleLines()}>
                {(line) => {
                  const difference = () =>
                    line.counted_qty === null ? null : line.counted_qty - line.system_qty;
                  return (
                    <tr>
                      <td data-label={strings.inventory.name}>{line.inventory_items?.name}</td>
                      <td
                        data-label={strings.stockOpname.systemQty}
                        class="data-table__cell--right"
                      >
                        {formatNumber(line.system_qty)} {line.inventory_items?.unit}
                      </td>
                      <td data-label={strings.stockOpname.countedQty}>
                        <input
                          class="input opname-count"
                          type="number"
                          min="0"
                          step="0.001"
                          aria-label={`${strings.stockOpname.countedQty} ${line.inventory_items?.name ?? ''}`}
                          value={line.counted_qty ?? ''}
                          disabled={opname()?.status === 'finalized'}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              event.currentTarget
                                .closest('tr')
                                ?.nextElementSibling?.querySelector<HTMLInputElement>('input')
                                ?.focus();
                            }
                          }}
                          onInput={(event) => updateCount(line, event.currentTarget.value)}
                        />
                      </td>
                      <td
                        data-label={strings.stockOpname.difference}
                        class={`data-table__cell--right ${(difference() ?? 0) < 0 ? 'ledger-quantity--negative' : ''}`}
                      >
                        {difference() === null ? '—' : formatNumber(difference()!)}
                      </td>
                      <td data-label={strings.sharedUi.saveState}>
                        {savingIds().includes(line.inventory_item_id)
                          ? strings.stockOpname.saving
                          : line.counted_qty === null
                            ? '—'
                            : strings.stockOpname.saved}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </Table>
        </Card>
      </Show>
      <Modal
        open={finalizeOpen()}
        title={strings.stockOpname.finalizeTitle}
        onClose={() => setFinalizeOpen(false)}
        size="sm"
      >
        <div class="finalize-opname">
          <p>{strings.stockOpname.finalizeDescription}</p>
          <Input
            label={strings.stockOpname.typeFinalize}
            value={confirmText()}
            onInput={(event) => setConfirmText(event.currentTarget.value)}
          />
          <div class="dialog-actions">
            <Button variant="secondary" onClick={() => setFinalizeOpen(false)}>
              {strings.common.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={confirmText() !== 'FINALISASI'}
              loading={finalizing()}
              onClick={() => void finalize()}
            >
              {strings.stockOpname.confirmFinalize}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function formatDateTime(value?: string): string {
  if (!value) return strings.common.loading;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}
