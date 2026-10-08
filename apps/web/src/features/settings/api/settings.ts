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
    const { data, error } = await client
      .from('store_settings')
      .update(input)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return data as StoreSettings;
  });
}

export async function updateBranding(input: BrandingInput): Promise<Result<StoreSettings>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('store_settings')
      .update(input)
      .eq('id', 1)
      .select()
      .single();
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
    const { data, error } = await client.rpc('create_staff', {
      p_email: input.email,
      p_full_name: input.full_name,
      p_role: input.role,
      p_password: input.password,
    });
    if (error) throw error;
    return data as StaffMember;
  });
}

export async function updateStaffRole(
  id: string,
  role: 'admin' | 'super_admin'
): Promise<Result<void>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { error } = await client.from('profiles').update({ role }).eq('id', id);
    if (error) throw error;
  });
}

export async function toggleStaffActive(id: string, isActive: boolean): Promise<Result<void>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { error } = await client.from('profiles').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  });
}
