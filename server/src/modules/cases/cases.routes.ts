import { Router } from 'express';
import { Role } from '@prisma/client';
import { CasesController } from './cases.controller.js';
import { EvidenceController } from '../evidence/evidence.controller.js';
import { evidenceUpload } from '../evidence/evidence.storage.js';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';

export const casesRouter = Router();

casesRouter.use(authenticate);

// Case management routes
casesRouter.get('/', CasesController.list);
casesRouter.post('/', requireRoles(Role.ADMIN, Role.INVESTIGATOR), CasesController.create);
casesRouter.get('/:caseId', CasesController.getById);
casesRouter.patch('/:caseId', requireRoles(Role.ADMIN, Role.INVESTIGATOR), CasesController.update);
casesRouter.post(
  '/:caseId/assign',
  requireRoles(Role.ADMIN, Role.INVESTIGATOR),
  CasesController.assign
);

// Case evidence routes
casesRouter.get('/:caseId/evidence', EvidenceController.listByCase);
casesRouter.post(
  '/:caseId/evidence',
  requireRoles(Role.ADMIN, Role.INVESTIGATOR),
  evidenceUpload.single('file'),
  EvidenceController.upload
);
