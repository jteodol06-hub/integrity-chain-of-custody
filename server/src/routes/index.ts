import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { auditRouter } from '../modules/audit/audit.routes.js';
import { casesRouter } from '../modules/cases/cases.routes.js';
import { evidenceRouter } from '../modules/evidence/evidence.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';

export const apiRouter = Router();

// Health and Diagnostics
apiRouter.use('/', healthRouter);

// Authentication & Identity
apiRouter.use('/auth', authRouter);

// Security & Audit Trail
apiRouter.use('/audit', auditRouter);

// Investigation Cases
apiRouter.use('/cases', casesRouter);

// Digital Evidence Vault
apiRouter.use('/evidence', evidenceRouter);

// Dashboard Metrics
apiRouter.use('/dashboard', dashboardRouter);
