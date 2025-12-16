import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { updateProfileSchema, createProfileSchema } from '../schemas/profile.schema';
import { ValidationError, UnauthorizedError } from '../lib/errors';

/**
 * Profile Controller
 * Handles HTTP requests for profile operations
 */
export class ProfileController {
  /**
   * GET /api/v1/profile
   * Get current authenticated user's profile
   */
  static async getCurrentProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const profile = await ProfileService.getCurrentUserProfile(
        req.accessToken,
        req.user.id
      );

      if (!profile) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'No profile found for this user',
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
   * GET /api/v1/profile/:userId
   * Get profile by user ID (public view, respects RLS)
   */
  static async getProfileByUserId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.accessToken) {
        throw new UnauthorizedError('Authentication required');
      }

      const { userId } = req.params;

      const profile = await ProfileService.getByUserId(userId, req.accessToken);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Profile not found',
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
   * POST /api/v1/profile
   * Create a new profile for the authenticated user
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

      // Validate request body
      const result = createProfileSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid profile data', result.error.errors);
      }

      const profile = await ProfileService.create(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Profile created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/profile
   * Update the authenticated user's profile
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

      // Validate request body
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid profile data', result.error.errors);
      }

      const profile = await ProfileService.update(
        req.user.id,
        result.data,
        req.accessToken
      );

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/profile
   * Delete the authenticated user's profile
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

      await ProfileService.delete(req.user.id, req.accessToken);

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
