import { Request, Response, NextFunction } from 'express';
import { createEvidenceSchema } from './evidence.schema.js';
import { EvidenceService } from './evidence.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export class EvidenceController {
  static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        const error: AppError = new Error('No evidence file provided in upload request');
        error.statusCode = 400;
        throw error;
      }

      const validatedData = createEvidenceSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await EvidenceService.registerEvidence(
        req.user!,
        req.params.caseId,
        validatedData,
        req.file,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Evidence registered successfully into ICCF vault',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await EvidenceService.getCaseEvidence(req.user!, req.params.caseId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await EvidenceService.getEvidenceById(req.user!, req.params.evidenceId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { filePath, originalFilename } = await EvidenceService.downloadEvidence(
        req.user!,
        req.params.evidenceId,
        ipAddress,
        userAgent
      );

      res.download(filePath, originalFilename);
    } catch (error) {
      next(error);
    }
  }
}
