import { createResource } from 'solid-js';
import {
  loadSettings,
  updateSettings,
  updateBranding,
  uploadLogo,
  loadStaff,
  createStaff,
  updateStaffRole,
  toggleStaffActive,
} from '../api/settings';
import {
  setSettings,
  setStaff,
  setSettingsLoading,
  setSettingsSaving,
  setSettingsError,
  updateSettingsInState,
  addStaffInState,
  updateStaffInState,
} from '../state/settings';
import type { SettingsInput, BrandingInput, StaffInput } from '../schemas/settings';

export function createSettingsResource() {
  const [settings, { refetch }] = createResource(
    () => true,
    async () => {
      setSettingsLoading(true);
      setSettingsError(null);
      const result = await loadSettings();
      setSettingsLoading(false);
      if (!result.ok) {
        setSettingsError(result.error.message);
        return null;
      }
      setSettings(result.data);
      return result.data;
    },
    { initialValue: null as StoreSettings | null }
  );

  return { settings, refetch };
}

export function createStaffResource() {
  const [staff, { refetch }] = createResource(
    () => true,
    async () => {
      const result = await loadStaff();
      if (!result.ok) return [];
      setStaff(result.data);
      return result.data;
    },
    { initialValue: [] as StaffMember[] }
  );

  return { staff, refetch };
}

type StoreSettings =
  Awaited<ReturnType<typeof loadSettings>> extends { ok: true; data: infer T } ? T : never;
type StaffMember =
  Awaited<ReturnType<typeof loadStaff>> extends { ok: true; data: infer T } ? T[number] : never;

export async function handleUpdateSettings(input: SettingsInput) {
  setSettingsSaving(true);
  try {
    const result = await updateSettings(input);
    if (!result.ok) throw new Error(result.error.message);
    updateSettingsInState(result.data);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan' };
  } finally {
    setSettingsSaving(false);
  }
}

export async function handleUpdateBranding(input: BrandingInput) {
  setSettingsSaving(true);
  try {
    const result = await updateBranding(input);
    if (!result.ok) throw new Error(result.error.message);
    updateSettingsInState(result.data);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan' };
  } finally {
    setSettingsSaving(false);
  }
}

export async function handleUploadLogo(file: File) {
  try {
    const result = await uploadLogo(file);
    if (!result.ok) throw new Error(result.error.message);
    updateSettingsInState({ logo_path: result.data });
    return { success: true, url: result.data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal mengunggah logo',
    };
  }
}

export async function handleCreateStaff(input: StaffInput) {
  setSettingsSaving(true);
  try {
    const result = await createStaff(input);
    if (!result.ok) throw new Error(result.error.message);
    addStaffInState(result.data);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal membuat staff',
    };
  } finally {
    setSettingsSaving(false);
  }
}

export async function handleUpdateStaffRole(id: string, role: 'admin' | 'super_admin') {
  try {
    const result = await updateStaffRole(id, role);
    if (!result.ok) throw new Error(result.error.message);
    updateStaffInState(id, { role });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal memperbarui peran',
    };
  }
}

export async function handleToggleStaffActive(id: string, isActive: boolean) {
  try {
    const result = await toggleStaffActive(id, isActive);
    if (!result.ok) throw new Error(result.error.message);
    updateStaffInState(id, { is_active: isActive });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal mengubah status',
    };
  }
}
