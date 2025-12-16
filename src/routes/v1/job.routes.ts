import { Router } from 'express';
import { JobController } from '../../controllers/job.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Job Routes
 *
 * Public Routes (no auth required):
 * GET    /api/v1/jobs              - Get public jobs with filters
 * GET    /api/v1/jobs/:jobId       - Get single job by ID
 * POST   /api/v1/jobs/:jobId/view  - Increment view count
 *
 * Protected Routes (auth required):
 * GET    /api/v1/jobs/employer/me        - Get current employer's jobs
 * GET    /api/v1/jobs/employer/me/count  - Get count of employer's jobs
 * POST   /api/v1/jobs                    - Create job (rate limited)
 * PUT    /api/v1/jobs/:jobId             - Update job (rate limited)
 * DELETE /api/v1/jobs/:jobId             - Delete job (rate limited)
 */

// ===== PUBLIC ROUTES =====

// Get public jobs with filters (must come before /:jobId to avoid conflict)
router.get('/', JobController.getPublicJobs);

// ===== PROTECTED ROUTES =====
// Note: Order matters - specific routes must come before parameterized routes

// Get current employer's jobs
router.get('/employer/me', authenticateJWT, JobController.getEmployerJobs);

// Get count of current employer's jobs
router.get('/employer/me/count', authenticateJWT, JobController.getEmployerJobsCount);

// Create a new job (rate limited)
router.post('/', authenticateJWT, mutationRateLimiter, JobController.createJob);

// ===== PUBLIC PARAMETERIZED ROUTES =====

// Increment view count (public, no auth)
router.post('/:jobId/view', JobController.incrementViewCount);

// Get single job by ID (public, no auth)
router.get('/:jobId', JobController.getJobById);

// ===== PROTECTED PARAMETERIZED ROUTES =====

// Update job (rate limited, owner only)
router.put('/:jobId', authenticateJWT, mutationRateLimiter, JobController.updateJob);

// Delete job (rate limited, owner only)
router.delete('/:jobId', authenticateJWT, mutationRateLimiter, JobController.deleteJob);

export default router;
