import path from 'path';
import fs from 'fs';
import {
  Role,
  EvidenceStatus,
  VerificationStatus,
  CustodyEventType,
  AuditOutcome,
} from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { CreateEvidenceInput } from './evidence.schema.js';
import { generateEvidenceReference } from '../../utils/reference.js';
import {
  computeFileSha256,
  computeCustodyEventHash,
  GENESIS_PREVIOUS_HASH,
} from '../../utils/crypto.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';
import { CasesService } from '../cases/cases.service.js';
import { validateFileContent } from '../../utils/fileValidation.js';

export class EvidenceService {
  /**
   * Registers a digital evidence file against a case, computes SHA-256 baseline,
   * creates the genesis custody event, and logs to the audit trail.
   */
  static async registerEvidence(
    user: AuthenticatedUser,
    caseId: string,
    input: CreateEvidenceInput,
    file: Express.Multer.File,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (user.role === Role.VIEWER) {
      // Remove uploaded physical file on disk if unauthorized
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);

      const error: AppError = new Error('Viewers are not authorized to register digital evidence');
      error.statusCode = 403;
      throw error;
    }

    // Verify authorized access to case
    const caseRecord = await CasesService.getCaseById(user, caseId);

    if (caseRecord.status === 'CLOSED' || caseRecord.status === 'ARCHIVED') {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);

      const error: AppError = new Error(
        `Cannot register evidence against a case with status '${caseRecord.status}'`
      );
      error.statusCode = 400;
      throw error;
    }

    // Perform deep content and magic byte validation
    const validation = await validateFileContent(file.path, file.originalname);
    if (!validation.isValid) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const error: AppError = new Error(
        validation.error || 'Security Policy Violation: File content failed integrity validation.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Calculate real SHA-256 hash from stored physical file bytes
    const sha256Hash = await computeFileSha256(file.path);
    let evidence;
    let attempts = 0;
    const timestamp = new Date();
    while (!evidence && attempts < 5) {
      attempts++;
      const evidenceReference = await generateEvidenceReference();

      try {
        evidence = await prisma.$transaction(async (tx) => {
          const createdEvidence = await tx.evidence.create({
            data: {
              evidenceReference,
              caseId,
              title: input.title,
              description: input.description,
              category: input.category,
              originalFilename: file.originalname,
              storageReference: file.filename, // randomized UUID filename on disk
              fileSizeBytes: BigInt(file.size),
              mimeType: file.mimetype,
              sha256Hash,
              status: EvidenceStatus.REGISTERED,
              latestVerificationStatus: VerificationStatus.NOT_VERIFIED,
              uploadedById: user.id,
              uploadedAt: timestamp,
            },
          });

          // Compute Genesis event canonical hash
          const genesisEventHash = computeCustodyEventHash({
            evidenceId: createdEvidence.id,
            eventType: CustodyEventType.EVIDENCE_REGISTERED,
            actorId: user.id,
            previousCustodianId: null,
            newCustodianId: user.id,
            reason: 'Initial evidence ingestion and registration into ICCF vault',
            timestamp,
            previousEventHash: GENESIS_PREVIOUS_HASH,
          });

          // Create Genesis Custody Event
          await tx.custodyEvent.create({
            data: {
              evidenceId: createdEvidence.id,
              actorId: user.id,
              eventType: CustodyEventType.EVIDENCE_REGISTERED,
              previousCustodianId: null,
              newCustodianId: user.id,
              reason: 'Initial evidence ingestion and registration into ICCF vault',
              notes: `Baseline SHA-256 calculated: ${sha256Hash}`,
              previousEventHash: GENESIS_PREVIOUS_HASH,
              currentEventHash: genesisEventHash,
              timestamp,
            },
          });

          return createdEvidence;
        });
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2002' && attempts < 5) {
          continue; // retry with fresh sequential reference
        }
        throw err;
      }
    }

    if (!evidence) {
      throw new Error('Failed to generate unique evidence reference after multiple attempts');
    }

    // Audit log
    await AuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_UPLOAD',
      resourceType: 'EVIDENCE',
      resourceId: evidence.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        evidenceReference: evidence.evidenceReference,
        caseReference: caseRecord.caseReference,
        originalFilename: evidence.originalFilename,
        fileSizeBytes: Number(evidence.fileSizeBytes),
        sha256Hash: evidence.sha256Hash,
      },
    });

    return {
      ...evidence,
      fileSizeBytes: Number(evidence.fileSizeBytes),
      storageReference: undefined, // Defense-in-depth: never leak disk storage identifiers
    };
  }

  /**
   * Retrieves all evidence registered under a specific case.
   */
  static async getCaseEvidence(user: AuthenticatedUser, caseId: string) {
    // Verifies user has access to this case
    await CasesService.getCaseById(user, caseId);

    const items = await prisma.evidence.findMany({
      where: { caseId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, email: true, fullName: true, badgeNumber: true },
        },
      },
    });

    return items.map((item) => ({
      ...item,
      fileSizeBytes: Number(item.fileSizeBytes),
      storageReference: undefined, // Hide server disk path
    }));
  }

  /**
   * Retrieves single evidence details with custody chain & verifications.
   */
  static async getEvidenceById(user: AuthenticatedUser, evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          select: {
            id: true,
            caseReference: true,
            title: true,
            status: true,
            createdById: true,
            assignments: { select: { userId: true } },
          },
        },
        uploadedBy: {
          select: { id: true, email: true, fullName: true, badgeNumber: true, department: true },
        },
        custodyEvents: {
          orderBy: { timestamp: 'asc' },
          include: {
            actor: { select: { id: true, fullName: true, email: true, badgeNumber: true } },
            previousCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
            newCustodian: { select: { id: true, fullName: true, badgeNumber: true } },
          },
        },
        verifications: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: {
            verifiedBy: { select: { id: true, fullName: true, badgeNumber: true } },
          },
        },
      },
    });

    if (!evidence) {
      const error: AppError = new Error('Evidence record not found');
      error.statusCode = 404;
      throw error;
    }

    // Access authorization check via associated case
    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
      }
    }

    return {
      ...evidence,
      fileSizeBytes: Number(evidence.fileSizeBytes),
      storageReference: undefined, // Hide server disk path
    };
  }

  /**
   * Prepares authorized download of raw evidence file and appends an EVIDENCE_DOWNLOADED custody event.
   */
  static async downloadEvidence(
    user: AuthenticatedUser,
    evidenceId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
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

    // RBAC: Check access to case
    if (user.role !== Role.ADMIN) {
      const isCreator = evidence.case.createdById === user.id;
      const isAssigned = evidence.case.assignments.some((a) => a.userId === user.id);

      if (!isCreator && !isAssigned) {
        const error: AppError = new Error('Access denied. You cannot download this evidence.');
        error.statusCode = 403;
        throw error;
      }
    }

    const storageDir = path.resolve(process.cwd(), env.EVIDENCE_STORAGE_PATH);
    const filePath = path.join(storageDir, evidence.storageReference);

    if (!fs.existsSync(filePath)) {
      const error: AppError = new Error('Evidence file was not found on vault disk storage');
      error.statusCode = 404;
      throw error;
    }

    const latestCustodyEvent = evidence.custodyEvents[0];
    const previousHash = latestCustodyEvent
      ? latestCustodyEvent.currentEventHash
      : GENESIS_PREVIOUS_HASH;
    const timestamp = new Date();

    const downloadEventHash = computeCustodyEventHash({
      evidenceId: evidence.id,
      eventType: CustodyEventType.EVIDENCE_DOWNLOADED,
      actorId: user.id,
      previousCustodianId: latestCustodyEvent?.newCustodianId || user.id,
      newCustodianId: latestCustodyEvent?.newCustodianId || user.id,
      reason: 'Authorized forensic evidence download for investigation analysis',
      timestamp,
      previousEventHash: previousHash,
    });

    // Record download custody event
    await prisma.custodyEvent.create({
      data: {
        evidenceId: evidence.id,
        actorId: user.id,
        eventType: CustodyEventType.EVIDENCE_DOWNLOADED,
        previousCustodianId: latestCustodyEvent?.newCustodianId || user.id,
        newCustodianId: latestCustodyEvent?.newCustodianId || user.id,
        reason: 'Authorized forensic evidence download for investigation analysis',
        notes: `Downloaded by ${user.fullName} (${user.email})`,
        previousEventHash: previousHash,
        currentEventHash: downloadEventHash,
        timestamp,
      },
    });

    // Audit log
    await AuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_DOWNLOAD',
      resourceType: 'EVIDENCE',
      resourceId: evidence.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: {
        evidenceReference: evidence.evidenceReference,
        originalFilename: evidence.originalFilename,
      },
    });

    return {
      filePath,
      originalFilename: evidence.originalFilename,
      mimeType: evidence.mimeType,
    };
  }
}
