import { createMemo, createSignal, For, Show } from 'solid-js';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Money } from '../../../shared/ui/Money';
import { strings } from '../../../shared/strings';
import type { MenuItem } from '../state/cart';
import type { ModifierOption } from '../api/pos';

export function ModifierDialog(props: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, modifiers: ModifierOption[], note: string) => void;
}) {
  const [selected, setSelected] = createSignal<string[]>([]);
  const [note, setNote] = createSignal('');
  const [error, setError] = createSignal('');
  const selectedOptions = createMemo(
    () =>
      props.item?.groups.flatMap((group) =>
        group.options.filter((option) => selected().includes(option.id))
      ) ?? []
  );

  function toggle(groupId: string, optionId: string, checked: boolean, max: number) {
    const current = selected();
    const inGroup =
      props.item?.groups
        .find((group) => group.id === groupId)
        ?.options.filter((option) => current.includes(option.id)).length ?? 0;
    if (checked && inGroup >= max) {
      setError(strings.pos.modifierLimit);
      return;
    }
    setError('');
    setSelected(checked ? [...current, optionId] : current.filter((id) => id !== optionId));
  }

  function add() {
    if (!props.item) return;
    const incomplete = props.item.groups.find((group) => {
      const count = group.options.filter((option) => selected().includes(option.id)).length;
      return count < group.min_select || count > group.max_select;
    });
    if (incomplete) {
      setError(strings.pos.modifierRequired.replace('{group}', incomplete.name));
      return;
    }
    props.onAdd(props.item, selectedOptions(), note().trim());
    setSelected([]);
    setNote('');
    setError('');
    props.onClose();
  }

  return (
    <Modal
      open={Boolean(props.item)}
      title={props.item?.name ?? strings.pos.modifiers}
      onClose={props.onClose}
      size="md"
    >
      <div class="modifier-groups">
        <For each={props.item?.groups}>
          {(group) => (
            <fieldset class="radio-group modifier-group">
              <legend class="field__label">
                {group.name}
                <span class="modifier-rule">
                  {group.min_select > 0 ? `${strings.pos.chooseAtLeast} ${group.min_select}` : ''}
                </span>
              </legend>
              <For each={group.options}>
                {(option) => (
                  <label class="modifier-option">
                    <input
                      type="checkbox"
                      checked={selected().includes(option.id)}
                      onChange={(event) =>
                        toggle(group.id, option.id, event.currentTarget.checked, group.max_select)
                      }
                    />
                    <span>{option.name}</span>
                    <Money value={option.extra_price} />
                  </label>
                )}
              </For>
            </fieldset>
          )}
        </For>
        <label class="field">
          <span class="field__label">{strings.pos.itemNote}</span>
          <textarea
            class="input textarea"
            maxlength="250"
            value={note()}
            onInput={(event) => setNote(event.currentTarget.value)}
          />
        </label>
        <Show when={error()}>
          <p class="form-message form-message--error" role="alert">
            {error()}
          </p>
        </Show>
        <Button variant="primary" onClick={add}>
          {strings.pos.addItem}
        </Button>
      </div>
    </Modal>
  );
}
