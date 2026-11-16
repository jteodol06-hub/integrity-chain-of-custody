import path from 'path';
import fs from 'fs';
import { VerificationStatus, CustodyEventType, AuditOutcome, Role } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  computeFileSha256,
  computeCustodyEventHash,
  GENESIS_PREVIOUS_HASH,
} from '../../utils/crypto.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';

export class VerificationService {
  /**
   * Performs real-time cryptographic SHA-256 verification of physical evidence against baseline.
   * NEVER alters the baseline originalHash under any circumstance.
   */
  static async verifyEvidence(
    user: AuthenticatedUser,
    evidenceId: string,
    notes?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      const error: AppError = new Error(
        'Viewers are not authorized to trigger integrity verification'
      );
      error.statusCode = 403;
      throw error;
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          include: {
            assignments: { select: { userId: true } },
          },
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

    // RBAC: Check case access
    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    const storageDir = path.resolve(process.cwd(), env.EVIDENCE_STORAGE_PATH);
    const filePath = path.join(storageDir, evidence.storageReference);
    const timestamp = new Date();

    let calculatedHash = '';
    let status: VerificationStatus = VerificationStatus.NOT_VERIFIED;
    let verificationNote = notes || '';

    if (!fs.existsSync(filePath)) {
      status = VerificationStatus.ERROR;
      verificationNote = 'Physical evidence file missing on vault disk storage';
      calculatedHash = 'FILE_NOT_FOUND_ON_DISK';
    } else {
      // Stream bytes and compute live SHA-256
      calculatedHash = await computeFileSha256(filePath);

      if (calculatedHash.toLowerCase() === evidence.sha256Hash.toLowerCase()) {
        status = VerificationStatus.VERIFIED;
      } else {
        status = VerificationStatus.MISMATCH;
        verificationNote =
          `CRYPTOGRAPHIC MISMATCH DETECTED! Physical hash differs from baseline. ${verificationNote}`.trim();
      }
    }

    const latestCustodyEvent = evidence.custodyEvents[0];
    const previousHash = latestCustodyEvent
      ? latestCustodyEvent.currentEventHash
      : GENESIS_PREVIOUS_HASH;

    // Append custody event for the verification attempt
    const verifyEventHash = computeCustodyEventHash({
      evidenceId: evidence.id,
      eventType: CustodyEventType.EVIDENCE_VERIFIED,
      actorId: user.id,
      previousCustodianId: latestCustodyEvent?.newCustodianId || user.id,
      newCustodianId: latestCustodyEvent?.newCustodianId || user.id,
      reason: `Cryptographic SHA-256 integrity verification: ${status}`,
      timestamp,
      previousEventHash: previousHash,
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Record immutable verification attempt
      const verificationRecord = await tx.integrityVerification.create({
        data: {
          evidenceId: evidence.id,
          verifiedById: user.id,
          originalHash: evidence.sha256Hash,
          calculatedHash,
          status,
          notes: verificationNote,
          timestamp,
        },
        include: {
          verifiedBy: {
            select: { id: true, fullName: true, badgeNumber: true, email: true },
          },
        },
      });

      // 2. Update latest verification status on Evidence (originalHash is PRESERVED)
      await tx.evidence.update({
        where: { id: evidence.id },
        data: {
          latestVerificationStatus: status,
        },
      });

      // 3. Append to custody ledger
      await tx.custodyEvent.create({
        data: {
          evidenceId: evidence.id,
          actorId: user.id,
          eventType: CustodyEventType.EVIDENCE_VERIFIED,
          previousCustodianId: latestCustodyEvent?.newCustodianId || user.id,
          newCustodianId: latestCustodyEvent?.newCustodianId || user.id,
          reason: `Cryptographic SHA-256 integrity verification: ${status}`,
          notes: `Result: ${status}. Calculated hash: ${calculatedHash}`,
          previousEventHash: previousHash,
          currentEventHash: verifyEventHash,
          timestamp,
        },
      });

      return verificationRecord;
    });

    // 4. Audit Log
    await AuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_INTEGRITY_VERIFY',
      resourceType: 'EVIDENCE',
      resourceId: evidence.id,
      outcome: status === VerificationStatus.VERIFIED ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      ipAddress,
      userAgent,
      metadata: {
        evidenceReference: evidence.evidenceReference,
        originalHash: evidence.sha256Hash,
        calculatedHash,
        status,
      },
    });

    return {
      verificationId: result.id,
      evidenceId: evidence.id,
      evidenceReference: evidence.evidenceReference,
      originalHash: evidence.sha256Hash,
      calculatedHash,
      status,
      isMatch: status === VerificationStatus.VERIFIED,
      timestamp,
      verifiedBy: result.verifiedBy,
      notes: verificationNote,
    };
  }

  /**
   * Retrieves past verification records for an evidence item.
   */
  static async getVerificationHistory(user: AuthenticatedUser, evidenceId: string) {
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

    return prisma.integrityVerification.findMany({
      where: { evidenceId },
      orderBy: { timestamp: 'desc' },
      include: {
        verifiedBy: {
          select: { id: true, fullName: true, badgeNumber: true, email: true },
        },
      },
    });
  }
}
