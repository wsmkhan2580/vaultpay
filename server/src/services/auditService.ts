import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

interface AuditEntryInput {
  actor: string | null;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Records an audit trail entry. Failures here must never break the request
 * that triggered them (auditing is important, but should not be a single
 * point of failure for e.g. a successful payment) — errors are logged and
 * swallowed.
 */
export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  try {
    await AuditLog.create({
      actor: entry.actor,
      actorEmail: entry.actorEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      metadata: entry.metadata,
      ip: entry.ip,
    });
  } catch (err) {
    logger.error('Failed to write audit log entry', {
      action: entry.action,
      resource: entry.resource,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}
