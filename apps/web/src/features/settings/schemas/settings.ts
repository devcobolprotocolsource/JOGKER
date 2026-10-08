import { z } from 'zod';

export const settingsSchema = z.object({
  store_name: z.string().min(1, 'Nama toko wajib diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  tax_percent: z.number().min(0).max(100).default(0),
  service_percent: z.number().min(0).max(100).default(0),
  rounding_rule: z.enum(['none', 'up_100', 'nearest_100']).default('none'),
  receipt_header: z.string().optional(),
  receipt_footer: z.string().optional(),
  paper_width_mm: z.union([z.literal(58), z.literal(80)]).default(58),
  require_payment_verification: z.boolean().default(true),
  operating_hours_start: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  operating_hours_end: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const brandingSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  font_family: z.enum(['Inter', 'Poppins', 'Plus Jakarta Sans', 'system-ui']).default('Inter'),
  logo_path: z.string().optional(),
});

export type BrandingInput = z.infer<typeof brandingSchema>;

export const staffSchema = z.object({
  email: z.string().email('Email tidak valid'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  role: z.enum(['admin', 'super_admin']),
  password: z.string().min(10, 'Password minimal 10 karakter').optional(),
});

export type StaffInput = z.infer<typeof staffSchema>;

export const roundingRuleOptions = [
  { value: 'none', label: 'Tidak dibulatkan' },
  { value: 'up_100', label: 'Bulat ke atas Rp 100' },
  { value: 'nearest_100', label: 'Bulat ke Rp 100 terdekat' },
] as const;

export const paperWidthOptions = [
  { value: '58', label: '58 mm' },
  { value: '80', label: '80 mm' },
] as const;

export const fontFamilyOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'system-ui', label: 'System UI' },
] as const;

export const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
] as const;
