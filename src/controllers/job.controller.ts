import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { createJobSchema, updateJobSchema, jobFiltersSchema } from '../schemas/job.schema';
import { ValidationError, UnauthorizedError, NotFoundError } from '../lib/errors';

/**
 * Job Controller
 * Handles HTTP requests for job operations
 */
export class JobController {
  /**
   * GET /api/v1/jobs
   * Get public jobs with optional filters (no auth required)
   */
  static async getPublicJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate query parameters
      const result = jobFiltersSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid filter parameters', result.error.errors);
      }

      const jobs = await JobService.getPublicJobs(result.data);

      res.status(200).json({
        success: true,
        data: jobs.data,
        pagination: jobs.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/:jobId
   * Get single job by ID (no auth required)
   */
  static async getJobById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await JobService.getById(jobId);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs/:jobId/view
   * Increment view count for a job (no auth required)
   */
  static async incrementViewCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobId } = req.params;

      await JobService.incrementViewCount(jobId);

      res.status(200).json({
        success: true,
        message: 'View count incremented',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/employer/me
   * Get current employer's jobs (auth required)
   */
  static async getEmployerJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const jobs = await JobService.getByUserId(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/employer/me/count
   * Get count of current employer's jobs (auth required)
   */
  static async getEmployerJobsCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const count = await JobService.getCountByUserId(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs
   * Create a new job posting (auth required)
   */
  static async createJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const result = createJobSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid job data', result.error.errors);
      }

      const job = await JobService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: job,
        message: 'Job created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/jobs/:jobId
   * Update a job posting (auth required, owner only)
   */
  static async updateJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { jobId } = req.params;

      // Validate request body
      const result = updateJobSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid job data', result.error.errors);
      }

      const job = await JobService.update(
        jobId,
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: job,
        message: 'Job updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/jobs/:jobId
   * Delete a job posting (auth required, owner only)
   */
  static async deleteJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { jobId } = req.params;

      await JobService.delete(jobId, req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Job deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
