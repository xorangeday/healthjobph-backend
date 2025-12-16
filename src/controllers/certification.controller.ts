import { Request, Response, NextFunction } from 'express';
import { CertificationService } from '../services/certification.service';
import { createCertificationSchema, updateCertificationSchema } from '../schemas/certification.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Certification Controller
 */
export class CertificationController {
  /**
   * GET /api/v1/certifications
   */
  static async getCertifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const certifications = await CertificationService.getForUser(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        data: certifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/certifications
   */
  static async createCertification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createCertificationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid certification data', result.error.errors);
      }

      const certification = await CertificationService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: certification,
        message: 'Certification created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/certifications/:certificationId
   */
  static async updateCertification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { certificationId } = req.params;

      const result = updateCertificationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid certification data', result.error.errors);
      }

      const certification = await CertificationService.update(
        certificationId,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: certification,
        message: 'Certification updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/certifications/:certificationId
   */
  static async deleteCertification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { certificationId } = req.params;

      await CertificationService.delete(certificationId, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Certification deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
