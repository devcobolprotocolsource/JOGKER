import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import type { AuditLogFilter, AuditLogEntry } from '../schemas/audit';

export async function loadAuditLogs(
  filter: AuditLogFilter
): Promise<Result<{ rows: AuditLogEntry[]; total: number }>> {
  return capture(async () => {
    const client = getSupabaseClient();
    let query = client
      .from('audit_logs')
      .select(`*, profiles!audit_logs_actor_id_fkey(full_name)`, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filter.action) {
      query = query.ilike('action', `%${filter.action}%`);
    }
    if (filter.entity) {
      query = query.eq('entity', filter.entity);
    }
    if (filter.actorId) {
      query = query.eq('actor_id', filter.actorId);
    }
    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate);
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 25;
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { rows: data as AuditLogEntry[], total: count ?? 0 };
  });
}
