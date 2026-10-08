import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Plus } from 'lucide-solid';
import {
  Button,
  Card,
  ConfirmDialog,
  CurrencyInput,
  Input,
  Modal,
  Money,
  Table,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { formatDateJakarta } from '../../../shared/lib/format';
import { voucherPreview } from '../logic/preview';
import {
  checkVoucherCode,
  loadVouchers,
  saveVoucher,
  activateVoucher,
  type VoucherRecord,
} from '../api/vouchers';
import { voucherSchema, type VoucherDraft } from '../schemas/voucher';
import { searchCode, setSearchCode } from '../state/vouchers';

function emptyVoucher(): VoucherDraft {
  const now = new Date();
  const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: '',
    name: '',
    type: 'percent',
    value: 10,
    min_subtotal: 0,
    max_discount: null,
    valid_from: now.toISOString(),
    valid_until: later.toISOString(),
    total_quota: null,
    per_order_limit: 1,
    is_active: true,
  };
}

function localInput(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function isoInput(value: string): string {
  return new Date(value).toISOString();
}

export function VouchersPage() {
  const [vouchers, setVouchers] = createSignal<VoucherRecord[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal('');
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [draft, setDraft] = createSignal<VoucherDraft>(emptyVoucher());
  const [deactivateTarget, setDeactivateTarget] = createSignal<VoucherRecord | null>(null);
  const [codeAvailable, setCodeAvailable] = createSignal<boolean | null>(null);
  const [preview, setPreview] = createSignal(voucherPreview('percent', 10, null));
  let codeTimer: number | undefined;
  const filtered = createMemo(() =>
    vouchers().filter((voucher) => voucher.code.includes(searchCode().toUpperCase()))
  );

  async function refresh() {
    const result = await loadVouchers();
    if (result.ok) setVouchers(result.data);
    else setError(result.error.message);
    setLoading(false);
  }
  onMount(() => void refresh());
  onCleanup(() => {
    if (codeTimer !== undefined) window.clearTimeout(codeTimer);
  });

  function update<K extends keyof VoucherDraft>(key: K, value: VoucherDraft[K]) {
    const next = { ...draft(), [key]: value };
    setDraft(next);
    if (key === 'type' || key === 'value' || key === 'max_discount') {
      setPreview(voucherPreview(next.type, next.value, next.max_discount));
    }
  }

  function updateCode(value: string) {
    const code = value.toUpperCase();
    update('code', code);
    setCodeAvailable(null);
    if (codeTimer !== undefined) window.clearTimeout(codeTimer);
    codeTimer = window.setTimeout(() => {
      void checkVoucherCode(code, draft().id).then((result) => {
        setCodeAvailable(result.ok ? result.data : null);
        if (!result.ok) setError(result.error.message);
      });
    }, 250);
  }

  async function submit() {
    const parsed = voucherSchema.safeParse(draft());
    if (!parsed.success || codeAvailable() === false) {
      setError(strings.vouchers.invalid);
      return;
    }
    setSaving(true);
    const result = await saveVoucher(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setEditorOpen(false);
    await refresh();
  }

  async function deactivate() {
    const target = deactivateTarget();
    if (!target) return;
    const result = await activateVoucher(target.id, false);
    setDeactivateTarget(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  function edit(voucher: VoucherRecord) {
    setDraft({ ...voucher });
    setPreview(voucherPreview(voucher.type, voucher.value, voucher.max_discount));
    setCodeAvailable(true);
    setEditorOpen(true);
  }

  return (
    <main class="vouchers-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">{strings.menu.catalog}</p>
          <h1>{strings.vouchers.title}</h1>
        </div>
        <Button
          onClick={() => {
            setDraft(emptyVoucher());
            setPreview(voucherPreview('percent', 10, null));
            setCodeAvailable(null);
            setEditorOpen(true);
          }}
        >
          <Plus size={18} aria-hidden={true} />
          {strings.vouchers.create}
        </Button>
      </header>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <div class="vouchers-toolbar">
        <Input
          label={strings.vouchers.search}
          value={searchCode()}
          onInput={(event) => setSearchCode(event.currentTarget.value.toUpperCase())}
        />
      </div>
      <Show when={!loading()} fallback={<p role="status">{strings.common.loading}</p>}>
        <Card class="vouchers-table-wrap">
          <Table caption={strings.vouchers.title}>
            <thead>
              <tr>
                <th scope="col">{strings.vouchers.code}</th>
                <th scope="col">{strings.vouchers.name}</th>
                <th scope="col">{strings.vouchers.value}</th>
                <th scope="col">{strings.vouchers.period}</th>
                <th scope="col">{strings.vouchers.quota}</th>
                <th scope="col">{strings.vouchers.status}</th>
                <th scope="col">{strings.vouchers.actions}</th>
              </tr>
            </thead>
            <tbody>
              <For each={filtered()}>
                {(voucher) => (
                  <tr>
                    <td data-label={strings.vouchers.code}>
                      <strong>{voucher.code}</strong>
                    </td>
                    <td data-label={strings.vouchers.name}>{voucher.name}</td>
                    <td data-label={strings.vouchers.value}>
                      <Show
                        when={voucher.type === 'percent'}
                        fallback={<Money value={voucher.value} />}
                      >{`${voucher.value}%`}</Show>
                    </td>
                    <td data-label={strings.vouchers.period}>
                      {formatDateJakarta(voucher.valid_from)} –{' '}
                      {formatDateJakarta(voucher.valid_until)}
                    </td>
                    <td data-label={strings.vouchers.quota}>
                      {voucher.used_count}
                      {voucher.total_quota === null ? '' : ` / ${voucher.total_quota}`}
                    </td>
                    <td data-label={strings.vouchers.status}>
                      {voucher.is_active ? strings.vouchers.active : strings.vouchers.inactive}
                    </td>
                    <td data-label={strings.vouchers.actions}>
                      <div class="voucher-row-actions">
                        <Button variant="secondary" size="sm" onClick={() => edit(voucher)}>
                          {strings.menu.edit}
                        </Button>
                        <Show when={voucher.is_active}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeactivateTarget(voucher)}
                          >
                            {strings.vouchers.deactivate}
                          </Button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </Card>
      </Show>
      <Modal
        open={editorOpen()}
        title={draft().id ? strings.vouchers.edit : strings.vouchers.create}
        onClose={() => setEditorOpen(false)}
        size="lg"
      >
        <div class="voucher-editor">
          <div class="voucher-form-grid">
            <Input
              label={strings.vouchers.code}
              value={draft().code}
              onInput={(event) => updateCode(event.currentTarget.value)}
              error={codeAvailable() === false ? strings.vouchers.codeTaken : undefined}
            />
            <Input
              label={strings.vouchers.name}
              value={draft().name}
              onInput={(event) => update('name', event.currentTarget.value)}
            />
            <label class="field">
              <span class="field__label">{strings.vouchers.type}</span>
              <select
                class="input"
                value={draft().type}
                onChange={(event) =>
                  update('type', event.currentTarget.value as 'percent' | 'nominal')
                }
              >
                <option value="percent">{strings.vouchers.percent}</option>
                <option value="nominal">{strings.vouchers.nominal}</option>
              </select>
            </label>
            <Show
              when={draft().type === 'percent'}
              fallback={
                <CurrencyInput
                  label={strings.vouchers.value}
                  value={draft().value}
                  onValueChange={(value) => update('value', value)}
                />
              }
            >
              <Input
                label={strings.vouchers.value}
                type="number"
                min="1"
                max="100"
                value={draft().value}
                onInput={(event) => update('value', Number(event.currentTarget.value))}
              />
            </Show>
            <CurrencyInput
              label={strings.vouchers.minimum}
              value={draft().min_subtotal}
              onValueChange={(value) => update('min_subtotal', value)}
            />
            <Show when={draft().type === 'percent'}>
              <CurrencyInput
                label={strings.vouchers.maxDiscount}
                value={draft().max_discount ?? 0}
                onValueChange={(value) => update('max_discount', value || null)}
              />
            </Show>
            <Input
              label={strings.vouchers.startDate}
              type="datetime-local"
              value={localInput(draft().valid_from)}
              onInput={(event) => update('valid_from', isoInput(event.currentTarget.value))}
            />
            <Input
              label={strings.vouchers.endDate}
              type="datetime-local"
              value={localInput(draft().valid_until)}
              onInput={(event) => update('valid_until', isoInput(event.currentTarget.value))}
            />
            <Input
              label={strings.vouchers.quota}
              type="number"
              min="1"
              value={draft().total_quota ?? ''}
              onInput={(event) =>
                update(
                  'total_quota',
                  event.currentTarget.value ? Number(event.currentTarget.value) : null
                )
              }
            />
          </div>
          <Card class="voucher-preview">
            <p>{strings.vouchers.preview}</p>
            <span>{strings.vouchers.samplePurchase}</span>
            <div>
              <span>{strings.pos.discount}</span>
              <Money value={preview().discount} />
            </div>
            <div>
              <strong>{strings.pos.total}</strong>
              <Money value={preview().total} />
            </div>
          </Card>
          <Show when={error()}>
            <p class="form-message form-message--error" role="alert">
              {error()}
            </p>
          </Show>
          <div class="dialog-actions">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              {strings.common.cancel}
            </Button>
            <Button loading={saving()} onClick={() => void submit()}>
              {strings.common.save}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(deactivateTarget())}
        title={strings.vouchers.deactivate}
        description={strings.vouchers.deactivateConfirm}
        destructive
        confirmLabel={strings.vouchers.deactivate}
        cancelLabel={strings.common.cancel}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void deactivate()}
      />
    </main>
  );
}
