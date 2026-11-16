import { Role, CasePriority, CaseStatus, Prisma, AuditOutcome } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { CreateCaseInput, UpdateCaseInput } from './cases.schema.js';
import { generateCaseReference } from '../../utils/reference.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';

export interface CaseQueryFilters {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  priority?: CasePriority;
  category?: string;
  search?: string;
}

export class CasesService {
  /**
   * Creates a new investigation case with auto-generated reference (e.g. ICCF-2026-0001)
   */
  static async createCase(
    user: AuthenticatedUser,
    input: CreateCaseInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      const error: AppError = new Error('Viewers are not authorized to create investigation cases');
      error.statusCode = 403;
      throw error;
    }

    let newCase;
    let attempts = 0;
    while (!newCase && attempts < 5) {
      attempts++;
      const caseReference = await generateCaseReference();

      try {
        newCase = await prisma.$transaction(async (tx) => {
          const created = await tx.case.create({
            data: {
              caseReference,
              title: input.title,
              description: input.description,
              category: input.category,
              priority: input.priority || CasePriority.MEDIUM,
              status: input.status || CaseStatus.OPEN,
              createdById: user.id,
            },
          });

          if (input.assignedUserIds && input.assignedUserIds.length > 0) {
            const assignmentData = input.assignedUserIds.map((userId) => ({
              caseId: created.id,
              userId,
              assignedById: user.id,
            }));

            await tx.caseAssignment.createMany({
              data: assignmentData,
              skipDuplicates: true,
            });
          }

          return created;
        });
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2002' && attempts < 5) {
          continue; // retry with fresh sequential reference
        }
        throw err;
      }
    }

    if (!newCase) {
      throw new Error('Failed to generate unique case reference after multiple attempts');
    }

    // Audit log
    await AuditService.record({
      actorId: user.id,
      action: 'CASE_CREATE',
      resourceType: 'CASE',
      resourceId: newCase.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        caseReference: newCase.caseReference,
        title: newCase.title,
        priority: newCase.priority,
      },
    });

    return this.getCaseById(user, newCase.id);
  }

  /**
   * Retrieves paginated cases with strict authorization filtering.
   * Admins view all cases; Investigators & Viewers view only cases they created or are assigned to.
   */
  static async getCases(user: AuthenticatedUser, filters: CaseQueryFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {};

    // RBAC: restrict to permitted cases for non-admins
    if (user.role !== Role.ADMIN) {
      where.OR = [{ createdById: user.id }, { assignments: { some: { userId: user.id } } }];
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { caseReference: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, cases] = await Promise.all([
      prisma.case.count({ where }),
      prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, email: true, fullName: true, role: true, badgeNumber: true },
          },
          assignments: {
            include: {
              user: {
                select: { id: true, email: true, fullName: true, role: true, badgeNumber: true },
              },
            },
          },
          _count: {
            select: { evidenceItems: true },
          },
        },
      }),
    ]);

    return {
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single case details if authorized.
   */
  static async getCaseById(user: AuthenticatedUser, caseId: string) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true, role: true, badgeNumber: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true, role: true, badgeNumber: true },
            },
            assignedBy: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        evidenceItems: {
          select: {
            id: true,
            evidenceReference: true,
            title: true,
            category: true,
            fileSizeBytes: true,
            mimeType: true,
            sha256Hash: true,
            status: true,
            latestVerificationStatus: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!caseRecord) {
      const error: AppError = new Error('Case not found');
      error.statusCode = 404;
      throw error;
    }

    // Access authorization check
    if (user.role !== Role.ADMIN) {
      const isCreator = caseRecord.createdById === user.id;
      const isAssigned = caseRecord.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    // Serialize BigInt fileSizeBytes for JSON response
    const sanitizedEvidence = caseRecord.evidenceItems.map((e) => ({
      ...e,
      fileSizeBytes: Number(e.fileSizeBytes),
    }));

    return {
      ...caseRecord,
      evidenceItems: sanitizedEvidence,
    };
  }

  /**
   * Updates an existing case's status or metadata.
   */
  static async updateCase(
    user: AuthenticatedUser,
    caseId: string,
    input: UpdateCaseInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      const error: AppError = new Error('Viewers cannot modify case records');
      error.statusCode = 403;
      throw error;
    }

    // Check authorization
    const existing = await this.getCaseById(user, caseId);

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.priority && { priority: input.priority }),
        ...(input.status && { status: input.status }),
      },
    });

    // Record audit event
    await AuditService.record({
      actorId: user.id,
      action: 'CASE_UPDATE',
      resourceType: 'CASE',
      resourceId: caseId,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        caseReference: existing.caseReference,
        previousStatus: existing.status,
        newStatus: updated.status,
        changes: input,
      },
    });

    return this.getCaseById(user, caseId);
  }

  /**
   * Assigns investigators to a case.
   */
  static async assignUsers(
    user: AuthenticatedUser,
    caseId: string,
    userIds: string[],
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      const error: AppError = new Error('Viewers cannot assign investigators');
      error.statusCode = 403;
      throw error;
    }

    const existingCase = await this.getCaseById(user, caseId);

    // Verify all userIds exist
    const usersToAssign = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
    });

    if (usersToAssign.length !== userIds.length) {
      const error: AppError = new Error('One or more specified users do not exist or are inactive');
      error.statusCode = 400;
      throw error;
    }

    await prisma.$transaction(
      userIds.map((targetUserId) =>
        prisma.caseAssignment.upsert({
          where: {
            caseId_userId: {
              caseId,
              userId: targetUserId,
            },
          },
          update: {
            assignedById: user.id,
            assignedAt: new Date(),
          },
          create: {
            caseId,
            userId: targetUserId,
            assignedById: user.id,
          },
        })
      )
    );

    await AuditService.record({
      actorId: user.id,
      action: 'CASE_ASSIGN',
      resourceType: 'CASE',
      resourceId: caseId,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        caseReference: existingCase.caseReference,
        assignedUserIds: userIds,
      },
    });

    return this.getCaseById(user, caseId);
  }
}
