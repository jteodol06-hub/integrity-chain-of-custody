import { Request, Response, NextFunction } from 'express';
import { createCaseSchema, updateCaseSchema, assignCaseSchema } from './cases.schema.js';
import { CasesService } from './cases.service.js';
import { CaseStatus, CasePriority } from '@prisma/client';

export class CasesController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createCaseSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await CasesService.createCase(req.user!, validatedData, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        message: 'Case created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        status: req.query.status as CaseStatus | undefined,
        priority: req.query.priority as CasePriority | undefined,
        category: req.query.category as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await CasesService.getCases(req.user!, filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CasesService.getCaseById(req.user!, req.params.caseId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateCaseSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await CasesService.updateCase(
        req.user!,
        req.params.caseId,
        validatedData,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = assignCaseSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await CasesService.assignUsers(
        req.user!,
        req.params.caseId,
        validatedData.userIds,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Investigators assigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
