import { withTenant } from "@/lib/db";

export async function audit(params: {
  tenantId: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  payload?: Record<string, any>;
}): Promise<void> {
  const {
    tenantId,
    actorUserId,
    action,
    targetType,
    targetId,
    requestId,
    payload,
  } = params;

  await withTenant(tenantId, async (client) => {
    await client.query(
      `INSERT INTO audit_logs (tenant_id, actor_user_id, action, target_type, target_id, request_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [tenantId, actorUserId, action, targetType, targetId, requestId, payload]
    );
  });
}

