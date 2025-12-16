import { Router } from 'express';
import healthRoutes from './health.routes';
import v1Routes from './v1';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);

// API v1 routes
router.use('/v1', v1Routes);

export default router;
