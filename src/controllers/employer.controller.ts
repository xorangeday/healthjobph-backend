import { Request, Response, NextFunction } from 'express';
import { EmployerService } from '../services/employer.service';
import { createEmployerSchema, updateEmployerSchema } from '../schemas/employer.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Employer Controller
 */
export class EmployerController {
  /**
   * GET /api/v1/employer/profile
   */
  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const profile = await EmployerService.getByUserId(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/employer/profile/:employerId
   */
  static async getProfileById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { employerId } = req.params;
      const profile = await EmployerService.getById(employerId, req.accessToken);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Employer profile not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/employer/profile
   */
  static async createProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createEmployerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid profile data', result.error.errors);
      }

      const profile = await EmployerService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Employer profile created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/employer/profile
   */
  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = updateEmployerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid profile data', result.error.errors);
      }

      const profile = await EmployerService.update(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Employer profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/employer/profile
   */
  static async deleteProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      await EmployerService.delete(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Employer profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
