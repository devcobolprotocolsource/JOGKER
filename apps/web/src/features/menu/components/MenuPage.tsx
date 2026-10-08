import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-solid';
import {
  Button,
  CurrencyInput,
  Input,
  Modal,
  Money,
  Select,
  Switch,
  Textarea,
  ConfirmDialog,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { categorySchema, menuItemSchema, type MenuItemInput } from '../schemas/menu';
import {
  loadMenu,
  saveCategory,
  saveMenuItem,
  setItemAvailable,
  softDeleteMenuItem,
  type MenuRecord,
} from '../api/menu';
import {
  categories,
  items,
  selectedCategoryId,
  setMenuData,
  setSelectedCategoryId,
} from '../state/menu';
import { moveItem } from '../logic/order';

const emptyItem = (categoryId: string): MenuItemInput => ({
  category_id: categoryId,
  name: '',
  description: '',
  price: 0,
  image_path: null,
  is_available: true,
  is_active: true,
  sort_order: 0,
});

export function MenuPage() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [categoryName, setCategoryName] = createSignal('');
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<MenuItemInput | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [formError, setFormError] = createSignal('');
  const [deactivateTarget, setDeactivateTarget] = createSignal<MenuRecord | null>(null);

  async function refresh() {
    const result = await loadMenu();
    if (result.ok) setMenuData(result.data.categories, result.data.items);
    else setError(result.error.message);
    setLoading(false);
  }
  onMount(() => void refresh());
  const visibleItems = () => items().filter((item) => item.category_id === selectedCategoryId());

  async function addCategory() {
    const parsed = categorySchema.safeParse({
      name: categoryName(),
      sort_order: categories().length,
    });
    if (!parsed.success) {
      setError(strings.menu.categoryRequired);
      return;
    }
    const result = await saveCategory(parsed.data.name, parsed.data.sort_order);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setCategoryName('');
    await refresh();
  }

  async function saveItem(input: MenuItemInput) {
    const parsed = menuItemSchema.safeParse(input);
    if (!parsed.success) {
      setFormError(strings.menu.invalidItem);
      return;
    }
    setSaving(true);
    const result = await saveMenuItem(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    setEditorOpen(false);
    setEditing(null);
    await refresh();
  }

  async function toggleAvailability(item: MenuRecord, available: boolean) {
    const result = await setItemAvailable(item.id, available);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function deactivate(item: MenuRecord) {
    setDeactivateTarget(item);
  }

  async function confirmDeactivate() {
    const item = deactivateTarget();
    if (!item) return;
    const result = await softDeleteMenuItem(item);
    setDeactivateTarget(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const reordered = moveItem(visibleItems(), index, direction);
    setLoading(true);
    for (const [sort_order, item] of reordered.entries()) {
      if (item.sort_order === sort_order) continue;
      const result = await saveMenuItem({ ...item, sort_order });
      if (!result.ok) {
        setError(result.error.message);
        await refresh();
        return;
      }
    }
    await refresh();
  }

  return (
    <main class="menu-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">{strings.menu.catalog}</p>
          <h1>{strings.menu.title}</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(emptyItem(selectedCategoryId()));
            setFormError('');
            setEditorOpen(true);
          }}
          disabled={!selectedCategoryId()}
        >
          <Plus size={18} aria-hidden={true} />
          {strings.menu.addItem}
        </Button>
      </header>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <div class="menu-manager">
          <aside class="menu-categories" aria-label={strings.menu.categories}>
            <For each={categories()}>
              {(category) => (
                <button
                  type="button"
                  aria-pressed={selectedCategoryId() === category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </button>
              )}
            </For>
            <form
              class="category-add"
              onSubmit={(event) => {
                event.preventDefault();
                void addCategory();
              }}
            >
              <Input
                label={strings.menu.newCategory}
                value={categoryName()}
                onInput={(event) => setCategoryName(event.currentTarget.value)}
              />
              <Button size="sm" variant="secondary" type="submit">
                <Plus size={16} aria-hidden={true} />
                {strings.menu.addCategory}
              </Button>
            </form>
          </aside>
          <section class="menu-items-list" aria-label={strings.menu.items}>
            <For each={visibleItems()}>
              {(item, index) => (
                <article class="menu-admin-row">
                  <div class="menu-admin-row__main">
                    <strong>{item.name}</strong>
                    <Money value={item.price} />
                    <Show when={item.description}>
                      <small>{item.description}</small>
                    </Show>
                  </div>
                  <Switch
                    label={item.is_available ? strings.menu.available : strings.menu.soldOut}
                    checked={item.is_available}
                    onChange={(value) => void toggleAvailability(item, value)}
                  />
                  <div class="menu-admin-row__actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={strings.menu.moveUp}
                      disabled={index() === 0 || loading()}
                      onClick={() => void move(index(), -1)}
                    >
                      <ArrowUp size={18} aria-hidden={true} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={strings.menu.moveDown}
                      disabled={index() === visibleItems().length - 1 || loading()}
                      onClick={() => void move(index(), 1)}
                    >
                      <ArrowDown size={18} aria-hidden={true} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditing({ ...item });
                        setFormError('');
                        setEditorOpen(true);
                      }}
                    >
                      {strings.menu.edit}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void deactivate(item)}>
                      <Trash2 size={16} aria-hidden={true} />
                      {strings.menu.deactivate}
                    </Button>
                  </div>
                </article>
              )}
            </For>
            <Show when={visibleItems().length === 0}>
              <p class="empty-state">{strings.menu.noItems}</p>
            </Show>
          </section>
        </div>
      </Show>
      <MenuItemEditor
        open={editorOpen()}
        item={editing()}
        categories={categories()}
        loading={saving()}
        error={formError()}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={(item) => void saveItem(item)}
      />
      <ConfirmDialog
        open={Boolean(deactivateTarget())}
        title={strings.menu.deactivate}
        description={strings.menu.deactivateConfirm.replace(
          '{name}',
          deactivateTarget()?.name ?? ''
        )}
        destructive
        confirmLabel={strings.menu.deactivate}
        cancelLabel={strings.common.cancel}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void confirmDeactivate()}
      />
    </main>
  );
}

function MenuItemEditor(props: {
  open: boolean;
  item: MenuItemInput | null;
  categories: { id: string; name: string }[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSave: (item: MenuItemInput) => void;
}) {
  const [draft, setDraft] = createSignal<MenuItemInput | null>(props.item);
  createEffect(() => {
    if (props.open) setDraft(props.item ? { ...props.item } : null);
  });
  const current = () => draft() ?? props.item;
  const update = (field: keyof MenuItemInput, value: string | number | boolean | null) => {
    const item = current();
    if (item) setDraft({ ...item, [field]: value });
  };
  return (
    <Modal
      open={props.open}
      title={current()?.id ? strings.menu.edit : strings.menu.addItem}
      onClose={props.onClose}
      size="md"
    >
      <form
        class="menu-item-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (current()) props.onSave(current()!);
        }}
      >
        <Input
          label={strings.menu.name}
          value={current()?.name ?? ''}
          onInput={(event) => update('name', event.currentTarget.value)}
        />
        <Select
          label={strings.menu.category}
          value={current()?.category_id ?? ''}
          onChange={(event) => update('category_id', event.currentTarget.value)}
          options={props.categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />
        <CurrencyInput
          label={strings.menu.price}
          value={current()?.price ?? 0}
          onValueChange={(value) => update('price', value)}
        />
        <Textarea
          label={strings.menu.description}
          value={current()?.description ?? ''}
          maxLength={500}
          onInput={(event) => update('description', event.currentTarget.value)}
        />
        <Switch
          label={strings.menu.active}
          checked={current()?.is_active ?? true}
          onChange={(value) => update('is_active', value)}
        />
        <Show when={props.error}>
          <p class="form-message form-message--error" role="alert">
            {props.error}
          </p>
        </Show>
        <div class="dialog-actions">
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit" loading={props.loading}>
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
