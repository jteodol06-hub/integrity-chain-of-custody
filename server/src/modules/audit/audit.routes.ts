import { Router } from 'express';
import { Role } from '@prisma/client';
import { AuditController } from './audit.controller.js';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';

export const auditRouter = Router();

// Only ADMIN users are authorized to inspect the system audit trail
auditRouter.get('/', authenticate, requireRoles(Role.ADMIN), AuditController.getAuditLogs);
