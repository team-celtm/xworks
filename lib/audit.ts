import pool from './db';

/**
 * Logs an administrative action in the audit_logs table.
 * Ensure to pass adminId (from JWT payload.id, not payload.userId).
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  beforeState: any,
  afterState: any,
  ipAddress?: string
) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        adminId,
        action,
        entityType,
        entityId,
        JSON.stringify({ before: beforeState, after: afterState }),
        ipAddress || null
      ]
    );
    console.log(`[AUDIT LOG] Admin ID ${adminId} performed action "${action}" on ${entityType} (ID: ${entityId})`);
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to write to audit_logs:', err);
  }
}
