import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import type { SettingsInput, BrandingInput, StaffInput } from '../schemas/settings';

export interface StoreSettings {
  id: number;
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_path: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  tax_percent: number;
  service_percent: number;
  rounding_rule: 'none' | 'up_100' | 'nearest_100';
  receipt_header: string | null;
  receipt_footer: string | null;
  paper_width_mm: 58 | 80;
  require_payment_verification: boolean;
  operating_hours_start: string | null;
  operating_hours_end: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
}

export async function loadSettings(): Promise<Result<StoreSettings>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('store_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return data as StoreSettings;
  });
}

export async function updateSettings(input: SettingsInput): Promise<Result<StoreSettings>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('update_store_settings', {
      p_settings: {
        store_name: input.store_name,
        address: input.address,
        phone: input.phone,
        tax_percent: input.tax_percent,
        service_percent: input.service_percent,
        rounding_rule: input.rounding_rule,
        receipt_header: input.receipt_header,
        receipt_footer: input.receipt_footer,
        paper_width_mm: input.paper_width_mm,
        require_verified_payment_before_complete: input.require_payment_verification,
        open_hours: {
          start: input.operating_hours_start ?? null,
          end: input.operating_hours_end ?? null,
        },
      },
    });
    if (error) throw error;
    return data as StoreSettings;
  });
}

export async function updateBranding(input: BrandingInput): Promise<Result<StoreSettings>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('update_store_settings', {
      p_settings: input,
    });
    if (error) throw error;
    return data as StoreSettings;
  });
}

export async function uploadLogo(file: File): Promise<Result<string>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const fileName = `logo-${Date.now()}.${ext}`;
    const { data, error } = await client.storage
      .from('public-assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: urlData } = client.storage.from('public-assets').getPublicUrl(data.path);
    return urlData.publicUrl;
  });
}

export async function loadStaff(): Promise<Result<StaffMember[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as StaffMember[];
  });
}

export async function createStaff(input: StaffInput): Promise<Result<StaffMember>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('STAFF_CREATE_UNAUTHORIZED');

    const response = await fetch('/api/admin/create-staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (response.status !== 201) {
      if (response.status === 400) throw new Error('STAFF_CREATE_INVALID');
      if (response.status === 401) throw new Error('STAFF_CREATE_UNAUTHORIZED');
      if (response.status === 403) throw new Error('STAFF_CREATE_FORBIDDEN');
      if (response.status === 405) throw new Error('STAFF_CREATE_METHOD_NOT_ALLOWED');
      throw new Error('STAFF_CREATE_FAILED');
    }
    const payload = (await response.json()) as { data: StaffMember };
    return payload.data;
  });
}

export async function updateStaffRole(
  id: string,
  role: 'admin' | 'super_admin'
): Promise<Result<void>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { error } = await client.rpc('set_staff_role', {
      p_user_id: id,
      p_role: role,
    });
    if (error) throw error;
  });
}

export async function toggleStaffActive(id: string, isActive: boolean): Promise<Result<void>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { error } = await client.rpc('set_staff_active', {
      p_user_id: id,
      p_active: isActive,
    });
    if (error) throw error;
  });
}
