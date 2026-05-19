import { db } from '@/lib/db'

/**
 * Log an admin action to the audit trail
 */
export async function logAudit(params: {
  adminId: string
  action: 'create' | 'update' | 'delete' | 'status_change' | 'toggle' | 'send' | 'upload' | 'settings_update'
  entity: string
  entityId?: string
  ipAddress?: string
  changes?: Record<string, unknown>
}) {
  try {
    await db.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ipAddress: params.ipAddress || null,
        changes: params.changes ? JSON.stringify(params.changes) : '{}',
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
