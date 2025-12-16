import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboard.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get job seeker dashboard stats
router.get('/job-seeker', DashboardController.getJobSeekerStats);

// Get employer dashboard stats
router.get('/employer', DashboardController.getEmployerStats);

export default router;
