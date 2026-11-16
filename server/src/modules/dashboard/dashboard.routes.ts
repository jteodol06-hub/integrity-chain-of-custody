import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/summary', DashboardController.getSummary);
dashboardRouter.get('/activity', DashboardController.getActivity);
