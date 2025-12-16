import { Request, Response, NextFunction } from 'express';
import { SavedJobService } from '../services/saved-job.service';
import { saveJobSchema } from '../schemas/saved-job.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Saved Job Controller
 */
export class SavedJobController {
  /**
   * GET /api/v1/saved-jobs
   */
  static async getSavedJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const savedJobs = await SavedJobService.getForUser(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: savedJobs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/saved-jobs/details
   */
  static async getSavedJobsWithDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const savedJobs = await SavedJobService.getWithDetails(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: savedJobs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/saved-jobs/count
   */
  static async getSavedJobsCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const count = await SavedJobService.getCount(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/saved-jobs/check/:jobId
   */
  static async checkIfSaved(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { jobId } = req.params;
      const isSaved = await SavedJobService.isSaved(req.user.id, jobId, req.accessToken);

      res.status(200).json({
        success: true,
        data: { isSaved },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/saved-jobs
   */
  static async saveJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = saveJobSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid job ID', result.error.errors);
      }

      const savedJob = await SavedJobService.save(
        req.user.id,
        result.data.job_id,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: savedJob,
        message: 'Job saved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/saved-jobs/:jobId
   */
  static async unsaveJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { jobId } = req.params;

      await SavedJobService.unsave(req.user.id, jobId, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Job unsaved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
