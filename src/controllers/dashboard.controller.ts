import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { UnauthorizedError } from '../lib/errors';

/**
 * Dashboard Controller
 */
export class DashboardController {
  /**
   * GET /api/v1/dashboard/job-seeker
   */
  static async getJobSeekerStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const stats = await DashboardService.getJobSeekerStats(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/employer
   */
  static async getEmployerStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const stats = await DashboardService.getEmployerStats(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
