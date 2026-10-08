import { createSignal, For, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ArrowRight, ClipboardList, Plus } from 'lucide-solid';
import { Button, Card, StatusBadge } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { formatDateJakarta, formatTimeJakarta } from '../../../shared/lib/format';
import { loadOpnames, startOpname, type OpnameRecord } from '../api/inventory';

export function StockOpnamePage() {
  const navigate = useNavigate();
  const [opnames, setOpnames] = createSignal<OpnameRecord[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [creating, setCreating] = createSignal(false);

  async function refresh() {
    const result = await loadOpnames();
    if (result.ok) setOpnames(result.data);
    else setError(result.error.message);
    setLoading(false);
  }
  onMount(() => void refresh());

  async function open() {
    setCreating(true);
    const result = await startOpname();
    setCreating(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    navigate(`/inventory/opname/${result.data.id}`);
  }

  return (
    <main class="opname-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">
            <a href="/inventory">{strings.inventory.title}</a>
          </p>
          <h1>{strings.stockOpname.title}</h1>
        </div>
        <Button loading={creating()} onClick={() => void open()}>
          <Plus size={18} aria-hidden={true} />
          {strings.inventory.startOpname}
        </Button>
      </header>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <Show
          when={opnames().length > 0}
          fallback={
            <Card class="opname-empty">
              <ClipboardList size={28} aria-hidden={true} />
              <p>{strings.stockOpname.empty}</p>
            </Card>
          }
        >
          <div class="opname-list">
            <For each={opnames()}>
              {(opname) => (
                <button
                  class="opname-row"
                  type="button"
                  onClick={() => navigate(`/inventory/opname/${opname.id}`)}
                >
                  <div>
                    <strong>
                      {formatDateJakarta(opname.opened_at)} · {formatTimeJakarta(opname.opened_at)}
                    </strong>
                    <small>{opname.id}</small>
                  </div>
                  <StatusBadge status={opname.status === 'draft' ? 'open' : 'completed'} />
                  <ArrowRight size={18} aria-hidden={true} />
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </main>
  );
}
