import { For, Show, createSignal, onMount } from 'solid-js';
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Toast,
  Toolbar,
  IconButton,
  Badge,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import {
  createPaymentAccountsResource,
  handleCreateAccount,
  handleUpdateAccount,
  handleDeleteAccount,
  handleReorderAccounts,
  getPaymentAccount,
} from '../logic/payments';
import {
  setSelectedAccountId,
  setAccountDialogOpen,
  setAccountDialogMode,
  selectedAccountId,
  accountDialogOpen,
  accountDialogMode,
} from '../state/payments';
import { paymentAccountSchema } from '../schemas/payment';
import type { PaymentAccount } from '../api/payments';

export function PaymentAccountsPage() {
  const { accounts, refetch } = createPaymentAccountsResource();
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(input: Parameters<typeof handleCreateAccount>[0]) {
    try {
      if (accountDialogMode() === 'create') {
        await handleCreateAccount(input);
        showToast('success', 'Rekening berhasil ditambahkan');
      } else {
        const id = selectedAccountId();
        if (id) {
          await handleUpdateAccount(id, input);
          showToast('success', 'Rekening berhasil diperbarui');
        }
      }
      setAccountDialogOpen(false);
      setSelectedAccountId(null);
      refetch();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal menyimpan');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus rekening ini?')) return;
    try {
      await handleDeleteAccount(id);
      showToast('success', 'Rekening dihapus');
      refetch();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal menghapus');
    }
  }

  function handleDragStart(e: DragEvent, id: string) {
    e.dataTransfer?.setData('text/plain', id);
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  function handleDragEnd(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  function handleDragLeave(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const sourceId = e.dataTransfer?.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const items = accounts();
    const sourceIndex = items.findIndex((a: PaymentAccount) => a.id === sourceId);
    const targetIndex = items.findIndex((a: PaymentAccount) => a.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const removed = newItems.splice(sourceIndex, 1)[0];
    if (!removed) return;
    newItems.splice(targetIndex, 0, removed);

    const updates = newItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    handleReorderAccounts(updates)
      .then(() => {
        refetch();
        showToast('success', 'Urutan diperbarui');
      })
      .catch(() => showToast('error', 'Gagal mengubah urutan'));
  }

  function openCreateDialog() {
    setAccountDialogMode('create');
    setSelectedAccountId(null);
    setAccountDialogOpen(true);
  }

  function openEditDialog(account: PaymentAccount) {
    setAccountDialogMode('edit');
    setSelectedAccountId(account.id);
    setAccountDialogOpen(true);
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.payments.title}</h1>
          <p class="page-subtitle">{strings.payments.subtitle}</p>
        </div>
        <div class="page-actions">
          <Button onClick={openCreateDialog}>
            <svg
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {strings.payments.addAccount}
          </Button>
        </div>
      </header>

      <Card>
        <Show when={accounts().length === 0}>
          <div class="empty-state">
            <svg
              class="empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 5v14" />
              <path d="M18 5v14" />
            </svg>
            <h2>{strings.payments.emptyTitle}</h2>
            <p>{strings.payments.emptyDescription}</p>
            <Button onClick={openCreateDialog} class="mt-4">
              {strings.payments.addAccount}
            </Button>
          </div>
        </Show>
        <Show when={accounts().length > 0}>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col" class="w-12" />
                  <th scope="col">{strings.payments.colProvider}</th>
                  <th scope="col">{strings.payments.colAccountName}</th>
                  <th scope="col">{strings.payments.colAccountNo}</th>
                  <th scope="col">{strings.payments.colMethod}</th>
                  <th scope="col">{strings.payments.colStatus}</th>
                  <th scope="col" class="w-32" />
                </tr>
              </thead>
              <tbody>
                <For each={accounts()}>
                  {(account) => (
                    <tr
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, account.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, account.id)}
                      class={account.is_active ? '' : 'row-muted'}
                    >
                      <td class="drag-handle" aria-label="Seret untuk mengurutkan">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true"
                        >
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="21" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                      </td>
                      <td>{account.provider}</td>
                      <td>{account.account_name}</td>
                      <td class="font-mono">{account.account_no.replace(/.(?=.{4})/g, '*')}</td>
                      <td>
                        <span class="badge badge-sm">
                          {account.method === 'transfer' ? 'Transfer' : 'E-Wallet'}
                        </span>
                      </td>
                      <td>
                        <Badge variant={account.is_active ? 'success' : 'danger'}>
                          {account.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td>
                        <Toolbar gap={4}>
                          <IconButton
                            label="Edit"
                            icon={() => (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            )}
                            variant="ghost"
                            onClick={() => openEditDialog(account)}
                          />
                          <IconButton
                            label="Hapus"
                            icon={() => (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                            variant="ghost"
                            onClick={() => handleDelete(account.id)}
                          />
                        </Toolbar>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Card>

      <AccountDialog
        open={accountDialogOpen()}
        onClose={() => {
          setAccountDialogOpen(false);
          setSelectedAccountId(null);
        }}
        mode={accountDialogMode()}
        account={selectedAccountId() ? (getPaymentAccount(selectedAccountId()!) ?? null) : null}
        onSubmit={handleSubmit}
      />

      <Show when={toast()}>
        <Toast
          open={true}
          title={toast()!.type === 'success' ? 'Berhasil' : 'Error'}
          message={toast()!.message}
          variant={toast()!.type}
          onClose={() => setToast(null)}
        />
      </Show>
    </div>
  );
}

function AccountDialog(props: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  account: {
    id: string;
    method: 'transfer' | 'ewallet';
    provider: string;
    account_name: string;
    account_no: string;
    is_active: boolean;
  } | null;
  onSubmit: (input: AccountForm) => void;
}) {
  interface AccountForm {
    method: 'transfer' | 'ewallet';
    provider: string;
    account_name: string;
    account_no: string;
    is_active: boolean;
  }
  const [form, setForm] = createSignal<AccountForm>({
    method: 'transfer',
    provider: '',
    account_name: '',
    account_no: '',
    is_active: true,
  });
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  onMount(() => {
    if (props.account) {
      setForm({
        method: props.account.method,
        provider: props.account.provider,
        account_name: props.account.account_name,
        account_no: props.account.account_no,
        is_active: props.account.is_active,
      });
    } else {
      setForm({
        method: 'transfer',
        provider: '',
        account_name: '',
        account_no: '',
        is_active: true,
      });
    }
    setErrors({});
  });

  function handleChange(field: keyof AccountForm, value: AccountForm[keyof AccountForm]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmitForm(e: Event) {
    e.preventDefault();
    const result = paymentAccountSchema.safeParse(form());
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      return;
    }
    await props.onSubmit(result.data);
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.mode === 'create' ? strings.payments.addAccount : strings.payments.editAccount}
      size="md"
    >
      <form onSubmit={handleSubmitForm} class="dialog-form">
        <div class="form-group">
          <Select
            label={strings.payments.colMethod}
            options={[
              { value: 'transfer', label: 'Transfer Bank' },
              { value: 'ewallet', label: 'E-Wallet' },
            ]}
            value={form().method}
            onChange={(v) => handleChange('method', v)}
            error={errors()['method']}
          />
        </div>
        <div class="form-group">
          <Input
            label={strings.payments.colProvider}
            placeholder="Contoh: BCA, DANA, GoPay"
            value={form().provider}
            onInput={(e) => handleChange('provider', e.currentTarget.value)}
            error={errors()['provider']}
          />
        </div>
        <div class="form-group">
          <Input
            label={strings.payments.colAccountName}
            placeholder="Nama pemilik rekening"
            value={form().account_name}
            onInput={(e) => handleChange('account_name', e.currentTarget.value)}
            error={errors()['account_name']}
          />
        </div>
        <div class="form-group">
          <Input
            label={strings.payments.colAccountNo}
            placeholder="Nomor rekening"
            value={form().account_no}
            onInput={(e) => handleChange('account_no', e.currentTarget.value)}
            error={errors()['account_no']}
            inputMode="numeric"
          />
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={form().is_active}
              onChange={(e) => handleChange('is_active', e.currentTarget.checked)}
            />
            <span>{strings.payments.active}</span>
          </label>
        </div>
        <div class="dialog-actions">
          <Button type="button" variant="secondary" onClick={props.onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit">
            {props.mode === 'create' ? strings.common.save : strings.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
