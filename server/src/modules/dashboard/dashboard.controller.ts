import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await DashboardService.getSummary(req.user!);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activity = await DashboardService.getActivity(req.user!);

      res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }
}
