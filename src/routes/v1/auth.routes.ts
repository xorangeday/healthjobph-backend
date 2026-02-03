import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();

// POST /api/v1/auth/register
// POST /api/v1/auth/register
router.post('/register', AuthController.register);

// GET /api/v1/auth/me
router.get('/me', authenticateJWT, AuthController.getCurrentUser);

export default router;
