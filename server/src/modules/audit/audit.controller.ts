import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';

export class AuditController {
  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const action = req.query.action as string | undefined;
      const resourceType = req.query.resourceType as string | undefined;
      const actorId = req.query.actorId as string | undefined;

      const result = await AuditService.getLogs({
        page,
        limit,
        action,
        resourceType,
        actorId,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}
