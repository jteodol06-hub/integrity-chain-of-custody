import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();

  res.json({
    status: 'ok',
    system: 'ICCF - Integrity & Chain-of-Custody Focused',
    version: '1.0.0-stage1',
    timestamp: new Date().toISOString(),
    database: {
      status: dbConnected
        ? 'connected'
        : 'disconnected (pending PostgreSQL start/migration in Stage 2)',
    },
    uptimeSeconds: Math.floor(process.uptime()),
  });
});
