import { createClient } from '@supabase/supabase-js';
import type { FullConfig } from '@playwright/test';

const credentials = [
  { email: 'e2e-admin@jokger.local', password: 'E2e-admin-2026!', role: 'admin' },
  {
    email: 'e2e-super-admin@jokger.local',
    password: 'E2e-super-admin-2026!',
    role: 'super_admin',
  },
] as const;

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const url = process.env['SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceRoleKey) {
    throw new Error('E2E requires local SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error('E2E setup only supports a local Supabase instance.');
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const credential of credentials) {
    const { data: listedUsers, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;
    const existingUser = listedUsers.users.find((user) => user.email === credential.email);

    const user = existingUser
      ? (
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            password: credential.password,
            email_confirm: true,
            user_metadata: { full_name: `E2E ${credential.role}` },
          })
        ).data.user
      : (
          await adminClient.auth.admin.createUser({
            email: credential.email,
            password: credential.password,
            email_confirm: true,
            user_metadata: { full_name: `E2E ${credential.role}` },
          })
        ).data.user;
    if (!user) throw new Error(`Failed to prepare E2E account ${credential.email}.`);

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: credential.role, is_active: true })
      .eq('id', user.id)
      .select('id')
      .single();
    if (profileError) throw profileError;
  }

  const { data: openShift, error: shiftError } = await adminClient
    .from('shifts')
    .select('id')
    .eq('status', 'open')
    .maybeSingle();
  if (shiftError) throw shiftError;
  if (openShift)
    throw new Error('E2E requires a clean database with no open shift; run supabase db reset.');
}
