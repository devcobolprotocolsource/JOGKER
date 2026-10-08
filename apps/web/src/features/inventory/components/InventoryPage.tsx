import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardList, Plus } from 'lucide-solid';
import {
  Button,
  Card,
  CurrencyInput,
  Input,
  Modal,
  Money,
  SearchInput,
  Switch,
  Table,
  Textarea,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { formatDateJakarta, formatTimeJakarta, formatNumber } from '../../../shared/lib/format';
import {
  inventoryItemSchema,
  stockMovementSchema,
  type InventoryItemInput,
} from '../schemas/inventory';
import {
  loadInventory,
  recordMovement,
  saveInventoryItem,
  type InventoryItem,
  type StockMovement,
} from '../api/inventory';
import { stockStatus, stockValue } from '../logic/stock';
import { onlyLowStock, searchTerm, setOnlyLowStock, setSearchTerm } from '../state/inventory';

const emptyItem = (): InventoryItemInput => ({
  name: '',
  unit: '',
  min_qty: 0,
  unit_cost: 0,
  is_active: true,
});

export function InventoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = createSignal<InventoryItem[]>([]);
  const [movements, setMovements] = createSignal<StockMovement[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [itemOpen, setItemOpen] = createSignal(false);
  const [itemDraft, setItemDraft] = createSignal<InventoryItemInput>(emptyItem());
  const [movementItem, setMovementItem] = createSignal<InventoryItem | null>(null);
  const [movementType, setMovementType] = createSignal<'purchase' | 'waste'>('purchase');
  const [movementQty, setMovementQty] = createSignal('');
  const [movementNote, setMovementNote] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const filteredItems = createMemo(() =>
    items().filter((item) => {
      const matchesSearch = item.name
        .toLocaleLowerCase('id-ID')
        .includes(searchTerm().toLocaleLowerCase('id-ID'));
      return (
        matchesSearch && (!onlyLowStock() || stockStatus(item.current_qty, item.min_qty) !== 'safe')
      );
    })
  );

  async function refresh() {
    const result = await loadInventory();
    if (result.ok) {
      setItems(result.data.items);
      setMovements(result.data.movements);
    } else setError(result.error.message);
    setLoading(false);
  }
  onMount(() => void refresh());

  async function saveItem() {
    const parsed = inventoryItemSchema.safeParse(itemDraft());
    if (!parsed.success) {
      setError(strings.menu.invalidItem);
      return;
    }
    setBusy(true);
    const result = await saveInventoryItem(parsed.data);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setItemOpen(false);
    await refresh();
  }

  async function saveMovement() {
    const parsed = stockMovementSchema.safeParse({
      itemId: movementItem()?.id,
      type: movementType(),
      quantity: Number(movementQty()),
      note: movementNote(),
    });
    if (!parsed.success) {
      setError(strings.inventory.movementInvalid);
      return;
    }
    setBusy(true);
    const result = await recordMovement(parsed.data);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMovementItem(null);
    setMovementQty('');
    setMovementNote('');
    setError('');
    await refresh();
  }

  function movementLabel(type: string): string {
    if (type === 'purchase') return strings.inventory.purchase;
    if (type === 'waste') return strings.inventory.waste;
    if (type === 'sale') return strings.orders.title;
    if (type === 'void_return') return strings.orderDetail.void;
    if (type === 'opname') return strings.inventory.opname;
    return type;
  }

  return (
    <main class="inventory-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">{strings.shell.shift}</p>
          <h1>{strings.inventory.title}</h1>
        </div>
        <div class="inventory-page__actions">
          <Button variant="secondary" onClick={() => navigate('/inventory/opname')}>
            <ClipboardList size={18} aria-hidden={true} />
            {strings.inventory.opname}
          </Button>
          <Button
            onClick={() => {
              setItemDraft(emptyItem());
              setItemOpen(true);
            }}
          >
            <Plus size={18} aria-hidden={true} />
            {strings.inventory.addItem}
          </Button>
        </div>
      </header>
      <div class="inventory-toolbar">
        <SearchInput label={strings.inventory.search} onSearch={setSearchTerm} />
        <Switch
          label={strings.inventory.onlyLow}
          checked={onlyLowStock()}
          onChange={setOnlyLowStock}
        />
      </div>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <Card class="inventory-table-wrap">
          <Table caption={strings.inventory.items}>
            <thead>
              <tr>
                <th scope="col">{strings.inventory.name}</th>
                <th scope="col">{strings.inventory.unit}</th>
                <th scope="col">{strings.inventory.current}</th>
                <th scope="col">{strings.inventory.minimum}</th>
                <th scope="col">{strings.inventory.stockValue}</th>
                <th scope="col">{strings.inventory.status}</th>
                <th scope="col">{strings.common.save}</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredItems()}>
                {(item) => {
                  const status = stockStatus(item.current_qty, item.min_qty);
                  return (
                    <tr>
                      <td data-label={strings.inventory.name}>
                        <strong>{item.name}</strong>
                      </td>
                      <td data-label={strings.inventory.unit}>{item.unit}</td>
                      <td data-label={strings.inventory.current} class="data-table__cell--right">
                        {formatNumber(item.current_qty)} {item.unit}
                      </td>
                      <td data-label={strings.inventory.minimum} class="data-table__cell--right">
                        {formatNumber(item.min_qty)} {item.unit}
                      </td>
                      <td data-label={strings.inventory.stockValue} class="data-table__cell--right">
                        <Money value={stockValue(item.current_qty, item.unit_cost)} />
                      </td>
                      <td data-label={strings.inventory.status}>
                        <span
                          class={`badge badge--${status === 'safe' ? 'success' : status === 'low' ? 'warning' : 'danger'}`}
                        >
                          {status === 'safe'
                            ? strings.inventory.safe
                            : status === 'low'
                              ? strings.inventory.low
                              : strings.inventory.out}
                        </span>
                      </td>
                      <td data-label={strings.common.save}>
                        <div class="inventory-row-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setMovementItem(item);
                              setMovementType('purchase');
                            }}
                          >
                            <ArrowDownToLine size={16} aria-hidden={true} />
                            {strings.inventory.purchase}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMovementItem(item);
                              setMovementType('waste');
                            }}
                          >
                            <ArrowUpFromLine size={16} aria-hidden={true} />
                            {strings.inventory.waste}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </Table>
          <Show when={filteredItems().length === 0}>
            <p class="empty-state">{strings.inventory.noItems}</p>
          </Show>
        </Card>
      </Show>
      <Card class="inventory-ledger">
        <h2>{strings.inventory.movement}</h2>
        <div class="inventory-ledger__list">
          <For each={movements()}>
            {(movement) => {
              const item = items().find((entry) => entry.id === movement.inventory_item_id);
              return (
                <article class="inventory-ledger__row">
                  <strong>{item?.name ?? movement.inventory_item_id}</strong>
                  <span>{movementLabel(movement.movement_type)}</span>
                  <span
                    class={
                      movement.qty_change < 0
                        ? 'ledger-quantity--negative'
                        : 'ledger-quantity--positive'
                    }
                  >
                    {movement.qty_change > 0 ? '+' : ''}
                    {formatNumber(movement.qty_change)} {item?.unit}
                  </span>
                  <time>
                    {formatDateJakarta(movement.created_at)} ·{' '}
                    {formatTimeJakarta(movement.created_at)}
                  </time>
                  <Show when={movement.note}>
                    <small>{movement.note}</small>
                  </Show>
                </article>
              );
            }}
          </For>
        </div>
      </Card>
      <Modal
        open={itemOpen()}
        title={strings.inventory.addItem}
        onClose={() => setItemOpen(false)}
        size="md"
      >
        <div class="inventory-editor">
          <Input
            label={strings.inventory.name}
            value={itemDraft().name}
            onInput={(event) => setItemDraft({ ...itemDraft(), name: event.currentTarget.value })}
          />
          <Input
            label={strings.inventory.unit}
            value={itemDraft().unit}
            onInput={(event) => setItemDraft({ ...itemDraft(), unit: event.currentTarget.value })}
          />
          <Input
            label={strings.inventory.minimum}
            type="number"
            min="0"
            step="0.001"
            value={itemDraft().min_qty}
            onInput={(event) =>
              setItemDraft({
                ...itemDraft(),
                min_qty: Number(event.currentTarget.value),
              })
            }
          />
          <CurrencyInput
            label={strings.inventory.unitCost}
            value={itemDraft().unit_cost}
            onValueChange={(value) => setItemDraft({ ...itemDraft(), unit_cost: value })}
          />
          <div class="dialog-actions">
            <Button variant="secondary" onClick={() => setItemOpen(false)}>
              {strings.common.cancel}
            </Button>
            <Button loading={busy()} onClick={() => void saveItem()}>
              {strings.common.save}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={Boolean(movementItem())}
        title={movementType() === 'purchase' ? strings.inventory.purchase : strings.inventory.waste}
        onClose={() => setMovementItem(null)}
        size="sm"
      >
        <div class="inventory-editor">
          <p>{movementItem()?.name}</p>
          <Input
            label={strings.inventory.quantity}
            type="number"
            min="0.001"
            step="0.001"
            value={movementQty()}
            onInput={(event) => setMovementQty(event.currentTarget.value)}
          />
          <Textarea
            label={strings.inventory.note}
            value={movementNote()}
            maxLength={500}
            onInput={(event) => setMovementNote(event.currentTarget.value)}
          />
          <div class="dialog-actions">
            <Button variant="secondary" onClick={() => setMovementItem(null)}>
              {strings.common.cancel}
            </Button>
            <Button loading={busy()} onClick={() => void saveMovement()}>
              {strings.inventory.saveMovement}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
