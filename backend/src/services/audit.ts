import { db } from '../database';
import { auditLogs } from '../types/database';
import { AuditEvent } from '../types/auth';

export class AuditService {
  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        oldValues: event.oldValues,
        newValues: event.newValues,
        metadata: event.metadata,
        organisationId: event.organisationId,
        timestamp: new Date(),
      });
    } catch (error) {
      // Log audit failure to console (don't throw to avoid breaking main flow)
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    organisationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    // TODO: Implement with proper filtering and pagination
    return db.select().from(auditLogs).limit(filters.limit || 50);
  }

  /**
   * Log user action
   */
  async logUserAction(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      actorId,
      action,
      resourceType,
      resourceId,
      metadata,
    });
  }

  /**
   * Log organisation action
   */
  async logOrganisationAction(
    actorId: string,
    organisationId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      actorId,
      action,
      resourceType,
      resourceId,
      organisationId,
      metadata,
    });
  }
}

export const auditService = new AuditService();