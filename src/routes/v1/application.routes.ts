import { Router } from 'express';
import { ApplicationController } from '../../controllers/application.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Application Routes
 * All routes require authentication
 *
 * Job Seeker Routes:
 * POST   /api/v1/applications                    - Create application (rate limited)
 * GET    /api/v1/applications/me                 - Get my applications
 * GET    /api/v1/applications/check?job_id=xxx   - Check if applied to a job
 * DELETE /api/v1/applications/:applicationId     - Withdraw application (rate limited)
 *
 * Employer Routes:
 * GET    /api/v1/applications/employer/me              - Get all applications for employer's jobs
 * GET    /api/v1/applications/job/:jobId               - Get applications for specific job
 * GET    /api/v1/applications/job/:jobId/stats         - Get application stats for job
 * PUT    /api/v1/applications/:applicationId/status    - Update application status (rate limited)
 *
 * Shared Routes:
 * GET    /api/v1/applications/:applicationId     - Get single application
 */

// All routes require authentication
router.use(authenticateJWT);

// ===== JOB SEEKER ROUTES =====

// Get my applications (job seeker)
router.get('/me', ApplicationController.getMyApplications);

// Check if applied to a job
router.get('/check', ApplicationController.checkApplied);

// Create a new application (rate limited)
router.post('/', mutationRateLimiter, ApplicationController.createApplication);

// ===== EMPLOYER ROUTES =====

// Get all applications for employer's jobs
router.get('/employer/me', ApplicationController.getEmployerApplications);

// Get applications for a specific job
router.get('/job/:jobId', ApplicationController.getJobApplications);

// Get application stats for a job
router.get('/job/:jobId/stats', ApplicationController.getJobApplicationStats);

// ===== PARAMETERIZED ROUTES =====
// Note: These must come after specific routes to avoid conflicts

// Get single application by ID
router.get('/:applicationId', ApplicationController.getApplicationById);

// Update application status (employer only, rate limited)
router.put('/:applicationId/status', mutationRateLimiter, ApplicationController.updateStatus);

// Withdraw application (job seeker only, rate limited)
router.delete('/:applicationId', mutationRateLimiter, ApplicationController.withdrawApplication);

export default router;
