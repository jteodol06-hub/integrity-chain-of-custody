import { Role, CustodyEventType, EvidenceStatus, AuditOutcome } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { TransferCustodyInput } from './custody.schema.js';
import { computeCustodyEventHash, GENESIS_PREVIOUS_HASH } from '../../utils/crypto.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';

export class CustodyService {
  /**
   * Retrieves the full chronological chain of custody for an evidence item.
   */
  static async getCustodyTimeline(user: AuthenticatedUser, evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          include: { assignments: { select: { userId: true } } },
        },
      },
    });

    if (!evidence) {
      const error: AppError = new Error('Evidence record not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    return prisma.custodyEvent.findMany({
      where: { evidenceId },
      orderBy: { timestamp: 'asc' },
      include: {
        actor: { select: { id: true, fullName: true, email: true, badgeNumber: true } },
        previousCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
        newCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
      },
    });
  }

  /**
   * Executes a formal custody transfer to another authorized investigator or custodian.
   */
  static async transferCustody(
    user: AuthenticatedUser,
    evidenceId: string,
    input: TransferCustodyInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      const error: AppError = new Error('Viewers are not authorized to transfer evidence custody');
      error.statusCode = 403;
      throw error;
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          include: { assignments: { select: { userId: true } } },
        },
        custodyEvents: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!evidence) {
      const error: AppError = new Error('Evidence record not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC check
    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    // Verify recipient user exists and is active
    const targetCustodian = await prisma.user.findUnique({
      where: { id: input.newCustodianId },
      select: { id: true, fullName: true, email: true, isActive: true },
    });

    if (!targetCustodian || !targetCustodian.isActive) {
      const error: AppError = new Error('Recipient custodian user was not found or is deactivated');
      error.statusCode = 400;
      throw error;
    }

    const latestEvent = evidence.custodyEvents[0];
    const previousHash = latestEvent ? latestEvent.currentEventHash : GENESIS_PREVIOUS_HASH;
    const currentCustodianId = latestEvent?.newCustodianId || user.id;
    const timestamp = new Date();

    const transferEventHash = computeCustodyEventHash({
      evidenceId: evidence.id,
      eventType: CustodyEventType.EVIDENCE_TRANSFERRED,
      actorId: user.id,
      previousCustodianId: currentCustodianId,
      newCustodianId: targetCustodian.id,
      reason: input.reason,
      timestamp,
      previousEventHash: previousHash,
    });

    const newCustodyRecord = await prisma.$transaction(async (tx) => {
      // 1. Create hash-linked transfer event
      const event = await tx.custodyEvent.create({
        data: {
          evidenceId: evidence.id,
          actorId: user.id,
          eventType: CustodyEventType.EVIDENCE_TRANSFERRED,
          previousCustodianId: currentCustodianId,
          newCustodianId: targetCustodian.id,
          reason: input.reason,
          notes: input.notes || null,
          previousEventHash: previousHash,
          currentEventHash: transferEventHash,
          timestamp,
        },
        include: {
          actor: { select: { id: true, fullName: true, email: true, badgeNumber: true } },
          previousCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
          newCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
        },
      });

      // 2. Update evidence custody status
      await tx.evidence.update({
        where: { id: evidence.id },
        data: {
          status: EvidenceStatus.TRANSFERRED,
        },
      });

      return event;
    });

    // 3. Record audit event
    await AuditService.record({
      actorId: user.id,
      action: 'CUSTODY_TRANSFER',
      resourceType: 'EVIDENCE',
      resourceId: evidence.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        evidenceReference: evidence.evidenceReference,
        previousCustodianId: currentCustodianId,
        newCustodianId: targetCustodian.id,
        reason: input.reason,
      },
    });

    return newCustodyRecord;
  }

  /**
   * Recalculates and validates the entire cryptographic chain of custody from genesis to latest event.
   * Reports broken links or modified event records.
   */
  static async verifyChain(user: AuthenticatedUser, evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          include: { assignments: { select: { userId: true } } },
        },
        custodyEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!evidence) {
      const error: AppError = new Error('Evidence record not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    const events = evidence.custodyEvents;

    if (events.length === 0) {
      return {
        isValid: false,
        totalEvents: 0,
        details: 'No chain of custody records exist for this evidence item.',
      };
    }

    for (let i = 0; i < events.length; i++) {
      const current = events[i];

      // 1. Verify previous hash pointer
      if (i === 0) {
        if (current.previousEventHash !== GENESIS_PREVIOUS_HASH) {
          return {
            isValid: false,
            totalEvents: events.length,
            brokenLinkIndex: 0,
            tamperedEventId: current.id,
            details: `Genesis event previous hash mismatch. Expected fixed genesis baseline, received: ${current.previousEventHash}`,
          };
        }
      } else {
        const previous = events[i - 1];
        if (current.previousEventHash !== previous.currentEventHash) {
          return {
            isValid: false,
            totalEvents: events.length,
            brokenLinkIndex: i,
            tamperedEventId: current.id,
            details: `Broken hash chain pointer at event #${i + 1} (${current.eventType}). Expected pointer to ${previous.currentEventHash}, received: ${current.previousEventHash}`,
          };
        }
      }

      // 2. Recompute canonical hash of event fields
      const recomputedHash = computeCustodyEventHash({
        evidenceId: current.evidenceId,
        eventType: current.eventType,
        actorId: current.actorId,
        previousCustodianId: current.previousCustodianId,
        newCustodianId: current.newCustodianId,
        reason: current.reason,
        timestamp: current.timestamp,
        previousEventHash: current.previousEventHash,
      });

      if (recomputedHash !== current.currentEventHash) {
        return {
          isValid: false,
          totalEvents: events.length,
          brokenLinkIndex: i,
          tamperedEventId: current.id,
          details: `Tampered event detected at index #${i + 1} (${current.eventType}). Event record data does not match its cryptographic signature.`,
        };
      }
    }

    return {
      isValid: true,
      totalEvents: events.length,
      latestEventHash: events[events.length - 1].currentEventHash,
      details: 'All custody events are intact and cryptographically linked.',
    };
  }
}
