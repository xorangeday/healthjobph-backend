import { Router } from 'express';
import { EducationController } from '../../controllers/education.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Education Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get all education entries
router.get('/', EducationController.getEducation);

// Create education entry
router.post('/', mutationRateLimiter, EducationController.createEducation);

// Update education entry
router.put('/:educationId', mutationRateLimiter, EducationController.updateEducation);

// Delete education entry
router.delete('/:educationId', mutationRateLimiter, EducationController.deleteEducation);

export default router;
