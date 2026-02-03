import { Router } from 'express';
import { ProfileController } from '../../controllers/profile.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Profile Routes
 * All routes require authentication
 *
 * GET    /api/v1/profile          - Get current user's profile
 * POST   /api/v1/profile          - Create profile
 * PUT    /api/v1/profile          - Update profile
 * DELETE /api/v1/profile          - Delete profile
 * GET    /api/v1/profile/:userId  - Get profile by user ID
 */

// All profile routes require authentication
router.use(authenticateJWT);

// Get current user's profile
router.get('/', ProfileController.getCurrentProfile);

// Create profile (rate limited)
router.post('/', mutationRateLimiter, ProfileController.createProfile);

// Update profile (rate limited)
router.put('/', mutationRateLimiter, ProfileController.updateProfile);

// Delete profile (rate limited)
router.delete('/', mutationRateLimiter, ProfileController.deleteProfile);

// Get profile by user ID (for viewing other profiles)
router.get('/:userId', ProfileController.getProfileByUserId);

// Get full job seeker profile by Job Seeker ID (public view for employers)
router.get('/job-seeker/:jobSeekerId', ProfileController.getJobSeekerProfile);

export default router;
