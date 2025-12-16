import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  checkAppliedSchema,
  getByJobSchema,
} from '../schemas/application.schema';
import { ValidationError, UnauthorizedError, NotFoundError } from '../lib/errors';

/**
 * Application Controller
 * Handles HTTP requests for application operations
 */
export class ApplicationController {
  /**
   * POST /api/v1/applications
   * Create a new application (job seeker only)
   */
  static async createApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const result = createApplicationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid application data', result.error.errors);
      }

      const application = await ApplicationService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: application,
        message: 'Application submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/me
   * Get current user's applications (job seeker)
   */
  static async getMyApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const applications = await ApplicationService.getByJobSeeker(
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/employer/me
   * Get applications for all of employer's jobs
   */
  static async getEmployerApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const applications = await ApplicationService.getByEmployer(
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/job/:jobId
   * Get applications for a specific job (employer only)
   */
  static async getJobApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate params
      const result = getByJobSchema.safeParse(req.params);
      if (!result.success) {
        throw new ValidationError('Invalid job ID', result.error.errors);
      }

      const applications = await ApplicationService.getByJob(
        result.data.jobId,
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/job/:jobId/stats
   * Get application statistics for a job (employer only)
   */
  static async getJobApplicationStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate params
      const result = getByJobSchema.safeParse(req.params);
      if (!result.success) {
        throw new ValidationError('Invalid job ID', result.error.errors);
      }

      const stats = await ApplicationService.getStats(
        result.data.jobId,
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/check
   * Check if current user has applied to a job
   */
  static async checkApplied(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate query params
      const result = checkAppliedSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid job ID', result.error.errors);
      }

      const hasApplied = await ApplicationService.hasApplied(
        result.data.job_id,
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: { hasApplied },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId
   * Get single application by ID
   */
  static async getApplicationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { applicationId } = req.params;

      const application = await ApplicationService.getById(
        applicationId,
        req.user.id,
        req.accessToken
      );

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/applications/:applicationId/status
   * Update application status (employer only)
   */
  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { applicationId } = req.params;

      // Validate request body
      const result = updateApplicationStatusSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid status data', result.error.errors);
      }

      const application = await ApplicationService.updateStatus(
        applicationId,
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: application,
        message: 'Application status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/applications/:applicationId
   * Withdraw application (job seeker only)
   */
  static async withdrawApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { applicationId } = req.params;

      await ApplicationService.withdraw(
        applicationId,
        req.user.id,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        message: 'Application withdrawn successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
