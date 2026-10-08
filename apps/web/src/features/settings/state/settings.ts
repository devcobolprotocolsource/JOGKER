import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { StoreSettings, StaffMember } from '../api/settings';

interface SettingsState {
  settings: StoreSettings | null;
  staff: StaffMember[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const [settingsState, setSettingsState] = createStore<SettingsState>({
  settings: null,
  staff: [],
  loading: false,
  saving: false,
  error: null,
});

export function getSettingsState() {
  return settingsState;
}

export function setSettings(settings: StoreSettings) {
  setSettingsState('settings', settings);
}

export function setStaff(staff: StaffMember[]) {
  setSettingsState('staff', staff);
}

export function setSettingsLoading(loading: boolean) {
  setSettingsState('loading', loading);
}

export function setSettingsSaving(saving: boolean) {
  setSettingsState('saving', saving);
}

export function setSettingsError(error: string | null) {
  setSettingsState('error', error);
}

export function updateSettingsInState(updates: Partial<StoreSettings>) {
  setSettingsState('settings', (prev: StoreSettings | null) =>
    prev ? { ...prev, ...updates } : null
  );
}

export function addStaffInState(staff: StaffMember) {
  setSettingsState('staff', [staff, ...settingsState.staff]);
}

export function updateStaffInState(id: string, updates: Partial<StaffMember>) {
  setSettingsState('staff', (staff) => staff.map((s) => (s.id === id ? { ...s, ...updates } : s)));
}

export const [generalDialogOpen, setGeneralDialogOpen] = createSignal(false);
export const [brandingDialogOpen, setBrandingDialogOpen] = createSignal(false);
export const [staffDialogOpen, setStaffDialogOpen] = createSignal(false);
export const [staffDialogMode, setStaffDialogMode] = createSignal<'create' | 'edit'>('create');
export const [selectedStaffId, setSelectedStaffId] = createSignal<string | null>(null);
