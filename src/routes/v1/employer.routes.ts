import { Router } from 'express';
import { EmployerController } from '../../controllers/employer.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Employer Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get current user's employer profile
router.get('/', EmployerController.getProfile);

// Get employer profile by ID
router.get('/:employerId', EmployerController.getProfileById);

// Create employer profile
router.post('/', mutationRateLimiter, EmployerController.createProfile);

// Update employer profile
router.put('/', mutationRateLimiter, EmployerController.updateProfile);

// Delete employer profile
router.delete('/', mutationRateLimiter, EmployerController.deleteProfile);

export default router;
