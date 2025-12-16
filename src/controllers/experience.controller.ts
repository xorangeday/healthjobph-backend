import { Request, Response, NextFunction } from 'express';
import { ExperienceService } from '../services/experience.service';
import { createExperienceSchema, updateExperienceSchema } from '../schemas/experience.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Experience Controller
 */
export class ExperienceController {
  /**
   * GET /api/v1/experience
   */
  static async getExperience(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const experience = await ExperienceService.getForUser(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/experience
   */
  static async createExperience(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createExperienceSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid experience data', result.error.errors);
      }

      const experience = await ExperienceService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: experience,
        message: 'Work experience entry created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/experience/:experienceId
   */
  static async updateExperience(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { experienceId } = req.params;

      const result = updateExperienceSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid experience data', result.error.errors);
      }

      const experience = await ExperienceService.update(
        experienceId,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: experience,
        message: 'Work experience entry updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/experience/:experienceId
   */
  static async deleteExperience(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { experienceId } = req.params;

      await ExperienceService.delete(experienceId, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Work experience entry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
