import { z } from 'zod';

export const auditLogFilterSchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>;

export interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string } | null;
}
