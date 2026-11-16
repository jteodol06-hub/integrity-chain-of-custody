import { Router } from 'express';
import { Role } from '@prisma/client';
import { EvidenceController } from './evidence.controller.js';
import { VerificationController } from '../verification/verification.controller.js';
import { CustodyController } from '../custody/custody.controller.js';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';

export const evidenceRouter = Router();

evidenceRouter.use(authenticate);

// Evidence Details & Download
evidenceRouter.get('/:evidenceId', EvidenceController.getById);
evidenceRouter.get('/:evidenceId/download', EvidenceController.download);

// Cryptographic Integrity Verification Endpoints
evidenceRouter.post(
  '/:evidenceId/verify',
  requireRoles(Role.ADMIN, Role.INVESTIGATOR),
  VerificationController.verify
);
evidenceRouter.get('/:evidenceId/verifications', VerificationController.history);

// Chain of Custody Endpoints (Append-only & Tamper verification)
evidenceRouter.get('/:evidenceId/custody', CustodyController.getTimeline);
evidenceRouter.post(
  '/:evidenceId/transfer',
  requireRoles(Role.ADMIN, Role.INVESTIGATOR),
  CustodyController.transfer
);
evidenceRouter.post('/:evidenceId/custody/verify', CustodyController.verifyChain);
