import { For, Show, createSignal, onMount } from 'solid-js';
import { UserPlus, Shield, EyeOff, Save } from 'lucide-solid';
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  Toast,
  Toolbar,
  IconButton,
  Badge,
  Switch,
  ConfirmDialog,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { settingsState } from '../state/settings';
import type { StaffMember } from '../api/settings';
import { loadStaff, createStaff, updateStaffRole, toggleStaffActive } from '../api/settings';
import { setStaff, setSettingsSaving, settingsState } from '../state/settings';
import { staffSchema, roleOptions } from '../schemas/settings';

export function StaffPage() {
  const [staff, setStaffSignal] = createSignal<
    Array<{
      id: string;
      full_name: string;
      email: string;
      role: 'admin' | 'super_admin';
      is_active: boolean;
      created_at: string;
    }>
  >([]);
  const [loading, setLoading] = createSignal(false);
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogMode, setDialogMode] = createSignal<'create' | 'edit'>('create');
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [confirmAction, setConfirmAction] = createSignal<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = createSignal('');

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadData() {
    setLoading(true);
    try {
      const result = await loadStaff();
      if (result.ok) {
        setStaffSignal(result.data);
        setStaff(result.data);
      } else {
        showToast('error', result.error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  onMount(loadData);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input = {
      email: formData.get('email') as string,
      full_name: formData.get('full_name') as string,
      role: formData.get('role') as 'admin' | 'super_admin',
      password: (formData.get('password') as string) || undefined,
    };

    const result = staffSchema.safeParse(input);
    if (!result.success) {
      showToast('error', 'Data tidak valid');
      return;
    }

    setSettingsSaving(true);
    try {
      if (dialogMode() === 'create') {
        const res = await createStaff(input);
        if (!res.ok) throw new Error(res.error.message);
        setStaffSignal((prev) => [res.data, ...prev]);
        showToast('success', strings.settings.staffCreated);
      } else {
        // Edit not implemented via RPC in this version
        showToast('error', 'Edit belum diimplementasikan');
        return;
      }
      setDialogOpen(false);
      setSelectedStaffId(null);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal menyimpan');
    } finally {
      setSettingsSaving(false);
    }
  }

  function openCreate() {
    setDialogMode('create');
    setSelectedStaffId(null);
    setDialogOpen(true);
  }

  function confirmToggleActive(staffMember: StaffMember, newStatus: boolean) {
    setConfirmMessage(
      newStatus ? strings.settings.activateConfirm : strings.settings.deactivateConfirm
    );
    setConfirmAction(() => handleToggleActive(staffMember.id, newStatus));
    setConfirmOpen(true);
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setSettingsSaving(true);
    try {
      const result = await toggleStaffActive(id, isActive);
      if (!result.ok) throw new Error(result.error.message);
      setStaffSignal((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s)));
      showToast('success', isActive ? strings.settings.activated : strings.settings.deactivated);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal mengubah status');
    } finally {
      setSettingsSaving(false);
    }
  }

  function confirmRoleChange(staffMember: StaffMember, newRole: 'admin' | 'super_admin') {
    setConfirmMessage(strings.settings.roleChangeConfirm);
    setConfirmAction(() => handleRoleChange(staffMember.id, newRole));
    setConfirmOpen(true);
  }

  async function handleRoleChange(id: string, role: 'admin' | 'super_admin') {
    setSettingsSaving(true);
    try {
      const result = await updateStaffRole(id, role);
      if (!result.ok) throw new Error(result.error.message);
      setStaffSignal((prev) => prev.map((s) => (s.id === id ? { ...s, role } : s)));
      showToast('success', strings.settings.roleUpdated);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal memperbarui peran');
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.settings.staff}</h1>
          <p class="page-subtitle">{strings.settings.staffSubtitle}</p>
        </div>
        <div class="page-actions">
          <Button onClick={openCreate}>
            <UserPlus size={18} aria-hidden="true" />
            {strings.settings.addStaff}
          </Button>
        </div>
      </header>

      <Card>
        <Show when={loading()}>
          <div class="skeleton-table">
            <For each={Array(5)}>{() => <div class="skeleton-row" />}</For>
          </div>
        </Show>
        <Show when={!loading() && staff().length === 0}>
          <div class="empty-state">
            <UserPlus size={48} aria-hidden="true" class="text-muted" />
            <h3>{strings.settings.emptyStaffTitle}</h3>
            <p>{strings.settings.emptyStaffDescription}</p>
            <Button onClick={openCreate} class="mt-4">
              <UserPlus size={18} aria-hidden="true" />
              {strings.settings.addStaff}
            </Button>
          </div>
        </Show>
        <Show when={!loading() && staff().length > 0}>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">{strings.settings.colName}</th>
                  <th scope="col">{strings.settings.colEmail}</th>
                  <th scope="col">{strings.settings.colRole}</th>
                  <th scope="col">{strings.settings.colStatus}</th>
                  <th scope="col">{strings.settings.colCreated}</th>
                  <th scope="col">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                <For each={staff()}>
                  {(s) => (
                    <tr>
                      <td>{s.full_name}</td>
                      <td>{s.email}</td>
                      <td>
                        <Badge variant={s.role === 'super_admin' ? 'warning' : 'info'}>
                          {s.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </td>
                      <td>
                        <Switch
                          checked={s.is_active}
                          onChange={(checked) => confirmToggleActive(s, checked)}
                          disabled={s.id === settingsState.profile?.id}
                        />
                      </td>
                      <td>{new Date(s.created_at).toLocaleDateString('id-ID')}</td>
                      <td>
                        <Toolbar gap={2}>
                          <IconButton
                            aria-label={
                              s.role === 'super_admin' ? 'Ubah ke Admin' : 'Ubah ke Super Admin'
                            }
                            variant="ghost"
                            onClick={() =>
                              confirmRoleChange(
                                s,
                                s.role === 'super_admin' ? 'admin' : 'super_admin'
                              )
                            }
                            disabled={s.id === settingsState.profile?.id}
                          >
                            <Shield size={18} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            aria-label="Nonaktifkan"
                            variant="ghost"
                            class="text-danger"
                            disabled={s.id === settingsState.profile?.id}
                          >
                            <EyeOff size={18} aria-hidden="true" />
                          </IconButton>
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

      <StaffDialog
        isOpen={dialogOpen()}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode()}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={confirmOpen()}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmAction()}
        title={strings.settings.confirm}
        message={confirmMessage()}
        confirmLabel={strings.common.save}
        cancelLabel={strings.common.cancel}
        variant="destructive"
      />

      <Show when={toast()}>
        <Toast type={toast()!.type} message={toast()!.message} onClose={() => setToast(null)} />
      </Show>
    </div>
  );
}

function StaffDialog(props: {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  onSubmit: (e: Event) => void;
}) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.mode === 'create' ? strings.settings.addStaff : strings.settings.editStaff}
      size="md"
    >
      <form onSubmit={(e) => props.onSubmit(e)} class="dialog-form">
        <div class="form-group">
          <label>{strings.settings.email}</label>
          <Input
            name="email"
            type="email"
            placeholder="staff@toko.com"
            required
            autoComplete="email"
          />
        </div>
        <div class="form-group">
          <label>{strings.settings.fullName}</label>
          <Input name="full_name" placeholder="Nama lengkap" required autoComplete="name" />
        </div>
        <div class="form-group">
          <label>{strings.settings.role}</label>
          <Select name="role" options={roleOptions} value="admin" />
        </div>
        <Show when={props.mode === 'create'}>
          <div class="form-group">
            <label>{strings.settings.password}</label>
            <Input
              name="password"
              type="password"
              placeholder="Minimal 10 karakter"
              required
              autoComplete="new-password"
            />
          </div>
        </Show>
        <div class="dialog-actions">
          <Button type="button" variant="secondary" onClick={props.onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit" variant="primary">
            <Save size={18} aria-hidden="true" />
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
