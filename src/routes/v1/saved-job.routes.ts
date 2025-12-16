import { Router } from 'express';
import { SavedJobController } from '../../controllers/saved-job.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Saved Jobs Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get all saved jobs
router.get('/', SavedJobController.getSavedJobs);

// Get saved jobs with details
router.get('/details', SavedJobController.getSavedJobsWithDetails);

// Get saved jobs count
router.get('/count', SavedJobController.getSavedJobsCount);

// Check if job is saved
router.get('/check/:jobId', SavedJobController.checkIfSaved);

// Save a job
router.post('/', mutationRateLimiter, SavedJobController.saveJob);

// Unsave a job
router.delete('/:jobId', mutationRateLimiter, SavedJobController.unsaveJob);

export default router;
