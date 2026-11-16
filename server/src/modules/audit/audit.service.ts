import { prisma } from '../../config/database.js';
import { AuditOutcome } from '@prisma/client';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome?: AuditOutcome;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Records an immutable security audit event.
   * Audit records track sensitive authentication, authorization, and forensic actions.
   */
  static async record(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          outcome: params.outcome || AuditOutcome.SUCCESS,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
    } catch (error) {
      // Audit failure should be logged to stderr but not crash caller flow
      console.error('CRITICAL: Failed to write to audit log:', error);
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs for authorized administrative review.
   */
  static async getLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
    actorId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.action) where.action = params.action;
    if (params.resourceType) where.resourceType = params.resourceType;
    if (params.actorId) where.actorId = params.actorId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              badgeNumber: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
