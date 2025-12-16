import { Request, Response, NextFunction } from 'express';
import { EducationService } from '../services/education.service';
import { createEducationSchema, updateEducationSchema } from '../schemas/education.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Education Controller
 */
export class EducationController {
  /**
   * GET /api/v1/education
   */
  static async getEducation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const education = await EducationService.getForUser(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: education,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/education
   */
  static async createEducation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createEducationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid education data', result.error.errors);
      }

      const education = await EducationService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: education,
        message: 'Education entry created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/education/:educationId
   */
  static async updateEducation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { educationId } = req.params;

      const result = updateEducationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid education data', result.error.errors);
      }

      const education = await EducationService.update(
        educationId,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: education,
        message: 'Education entry updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/education/:educationId
   */
  static async deleteEducation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { educationId } = req.params;

      await EducationService.delete(educationId, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Education entry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
