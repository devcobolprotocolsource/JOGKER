import { createRoot } from 'solid-js';
import { waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/settings', () => ({
  loadSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateBranding: vi.fn(),
  uploadLogo: vi.fn(),
  loadStaff: vi.fn(),
  createStaff: vi.fn(),
  updateStaffRole: vi.fn(),
  toggleStaffActive: vi.fn(),
}));

import {
  createStaff,
  loadSettings,
  loadStaff,
  toggleStaffActive,
  updateBranding,
  updateSettings,
  updateStaffRole,
  uploadLogo,
} from '../api/settings';
import { getSettingsState, setSettingsError, setStaff } from '../state/settings';
import type { BrandingInput, SettingsInput, StaffInput } from '../schemas/settings';
import {
  createSettingsResource,
  createStaffResource,
  handleCreateStaff,
  handleToggleStaffActive,
  handleUpdateBranding,
  handleUpdateSettings,
  handleUpdateStaffRole,
  handleUploadLogo,
} from './settings';

const settings = {
  id: 1,
  store_name: 'Cafe',
  address: null,
  phone: null,
  logo_path: null,
  primary_color: '#6F4E37',
  accent_color: '#F5E6D3',
  font_family: 'Inter',
  tax_percent: 0,
  service_percent: 0,
  rounding_rule: 'none' as const,
  receipt_header: null,
  receipt_footer: null,
  paper_width_mm: 58 as const,
  require_payment_verification: true,
  operating_hours_start: null,
  operating_hours_end: null,
  updated_by: null,
  updated_at: '2024-01-01T00:00:00Z',
};

const staff = {
  id: 'staff-1',
  full_name: 'Staff One',
  email: 'staff@example.com',
  role: 'admin' as const,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const failure = {
  ok: false as const,
  error: { code: 'UNKNOWN' as const, message: 'Request failed' },
};

describe('settings logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSettingsError(null);
    setStaff([]);
  });

  it('loads settings and staff into their resources and state', async () => {
    vi.mocked(loadSettings).mockResolvedValue({ ok: true, data: settings });
    vi.mocked(loadStaff).mockResolvedValue({ ok: true, data: [staff] });

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createSettingsResource();
      createStaffResource();
    });

    await waitFor(() => expect(getSettingsState().settings?.store_name).toBe('Cafe'));
    expect(getSettingsState().staff).toEqual([staff]);
    dispose();
  });

  it('returns empty values when either resource fails', async () => {
    vi.mocked(loadSettings).mockResolvedValue(failure);
    vi.mocked(loadStaff).mockResolvedValue(failure);

    let dispose!: () => void;
    createRoot((disposeRoot) => {
      dispose = disposeRoot;
      createSettingsResource();
      createStaffResource();
    });

    await waitFor(() => expect(getSettingsState().error).toBe('Request failed'));
    expect(getSettingsState().staff).toEqual([]);
    dispose();
  });

  it('applies successful settings, branding, logo, and staff updates', async () => {
    const settingsInput: SettingsInput = {
      store_name: 'Updated Cafe',
      tax_percent: 0,
      service_percent: 0,
      rounding_rule: 'none',
      paper_width_mm: 58,
      require_payment_verification: true,
    };
    const brandingInput: BrandingInput = {
      primary_color: '#6F4E37',
      accent_color: '#F5E6D3',
      font_family: 'Inter',
    };
    const staffInput: StaffInput = {
      email: staff.email,
      full_name: staff.full_name,
      role: 'admin',
      password: 'strong-password',
    };
    vi.mocked(updateSettings).mockResolvedValue({
      ok: true,
      data: { ...settings, ...settingsInput },
    });
    vi.mocked(updateBranding).mockResolvedValue({ ok: true, data: settings });
    vi.mocked(uploadLogo).mockResolvedValue({ ok: true, data: 'logo.png' });
    vi.mocked(createStaff).mockResolvedValue({ ok: true, data: staff });
    vi.mocked(updateStaffRole).mockResolvedValue({ ok: true, data: undefined });
    vi.mocked(toggleStaffActive).mockResolvedValue({ ok: true, data: undefined });

    expect(await handleUpdateSettings(settingsInput)).toEqual({ success: true });
    expect(await handleUpdateBranding(brandingInput)).toEqual({ success: true });
    expect(await handleUploadLogo(new File(['logo'], 'logo.png'))).toEqual({
      success: true,
      url: 'logo.png',
    });
    expect(await handleCreateStaff(staffInput)).toEqual({ success: true });
    expect(await handleUpdateStaffRole(staff.id, 'super_admin')).toEqual({ success: true });
    expect(await handleToggleStaffActive(staff.id, false)).toEqual({ success: true });
    expect(getSettingsState().settings?.logo_path).toBe('logo.png');
    expect(getSettingsState().staff[0]?.id).toBe(staff.id);
    expect(getSettingsState().staff[0]?.role).toBe('super_admin');
    expect(getSettingsState().staff[0]?.is_active).toBe(false);
  });

  it('returns explicit mutation errors when API operations fail', async () => {
    vi.mocked(updateSettings).mockResolvedValue(failure);
    vi.mocked(updateBranding).mockResolvedValue(failure);
    vi.mocked(uploadLogo).mockResolvedValue(failure);
    vi.mocked(createStaff).mockResolvedValue(failure);
    vi.mocked(updateStaffRole).mockResolvedValue(failure);
    vi.mocked(toggleStaffActive).mockResolvedValue(failure);

    const input: SettingsInput = {
      store_name: 'Cafe',
      tax_percent: 0,
      service_percent: 0,
      rounding_rule: 'none',
      paper_width_mm: 58,
      require_payment_verification: true,
    };
    const branding: BrandingInput = {
      primary_color: '#6F4E37',
      accent_color: '#F5E6D3',
      font_family: 'Inter',
    };
    const member: StaffInput = {
      email: staff.email,
      full_name: staff.full_name,
      role: 'admin',
    };

    expect(await handleUpdateSettings(input)).toEqual({
      success: false,
      message: 'Request failed',
    });
    expect(await handleUpdateBranding(branding)).toEqual({
      success: false,
      message: 'Request failed',
    });
    expect(await handleUploadLogo(new File(['logo'], 'logo.png'))).toEqual({
      success: false,
      message: 'Request failed',
    });
    expect(await handleCreateStaff(member)).toEqual({ success: false, message: 'Request failed' });
    expect(await handleUpdateStaffRole(staff.id, 'admin')).toEqual({
      success: false,
      message: 'Request failed',
    });
    expect(await handleToggleStaffActive(staff.id, true)).toEqual({
      success: false,
      message: 'Request failed',
    });
  });
});
