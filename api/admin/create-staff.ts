import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

const staffSchema = z.object({
  email: z.string().trim().email(),
  full_name: z.string().trim().min(1).max(120),
  password: z.string().min(10),
  role: z.enum(['admin', 'super_admin']).default('admin'),
});

export default async function createStaff(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  response.setHeader('Allow', 'POST');
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const authorization = request.headers.authorization;
  const token = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!token?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'NOT_AUTHORIZED' });
    return;
  }
  const parsed = staffSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'INPUT_INVALID' });
    return;
  }
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return;
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const accessToken = token.slice('Bearer '.length);
  const { data: authData, error: authError } =
    await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    response.status(401).json({ error: 'NOT_AUTHORIZED' });
    return;
  }
  const { data: caller, error: profileError } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) {
    response.status(500).json({ error: 'PROFILE_LOOKUP_FAILED' });
    return;
  }
  if (caller?.role !== 'super_admin' || !caller.is_active) {
    response.status(403).json({ error: 'NOT_AUTHORIZED' });
    return;
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
  if (createError || !created.user) {
    response.status(createError?.status === 422 ? 400 : 500).json({
      error:
        createError?.status === 422 ? 'INPUT_INVALID' : 'STAFF_CREATE_FAILED',
    });
    return;
  }
  const { data: profile, error: updateError } = await adminClient
    .from('profiles')
    .update({ full_name: parsed.data.full_name, role: parsed.data.role })
    .eq('id', created.user.id)
    .select('id, full_name, role, is_active, created_at')
    .single();
  if (updateError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    response.status(500).json({ error: 'STAFF_PROFILE_FAILED' });
    return;
  }
  const { error: auditError } = await adminClient.from('audit_logs').insert({
    actor_id: authData.user.id,
    action: 'staff.create',
    entity: 'profile',
    entity_id: created.user.id,
    payload: {
      email: created.user.email ?? parsed.data.email,
      role: parsed.data.role,
    },
  });
  if (auditError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    response.status(500).json({ error: 'STAFF_AUDIT_FAILED' });
    return;
  }
  response.status(201).json({
    data: { ...profile, email: created.user.email ?? parsed.data.email },
  });
}
