import { Router } from 'express';
import { ExperienceController } from '../../controllers/experience.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Experience Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get all experience entries
router.get('/', ExperienceController.getExperience);

// Create experience entry
router.post('/', mutationRateLimiter, ExperienceController.createExperience);

// Update experience entry
router.put('/:experienceId', mutationRateLimiter, ExperienceController.updateExperience);

// Delete experience entry
router.delete('/:experienceId', mutationRateLimiter, ExperienceController.deleteExperience);

export default router;
