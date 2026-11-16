import { Request, Response, NextFunction } from 'express';
import { VerificationService } from './verification.service.js';

export class VerificationController {
  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const notes = req.body?.notes as string | undefined;

      const result = await VerificationService.verifyEvidence(
        req.user!,
        req.params.evidenceId,
        notes,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message:
          result.status === 'VERIFIED'
            ? 'Cryptographic integrity verified. File matches original baseline.'
            : 'WARNING: Cryptographic integrity check failed or returned mismatch.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async history(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VerificationService.getVerificationHistory(
        req.user!,
        req.params.evidenceId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
