import { Request, Response, NextFunction } from 'express';
import { transferCustodySchema } from './custody.schema.js';
import { CustodyService } from './custody.service.js';

export class CustodyController {
  static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustodyService.getCustodyTimeline(req.user!, req.params.evidenceId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = transferCustodySchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await CustodyService.transferCustody(
        req.user!,
        req.params.evidenceId,
        validatedData,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Evidence custody transferred successfully and appended to ledger',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustodyService.verifyChain(req.user!, req.params.evidenceId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
