import { Router } from 'express';
import { DocumentController } from '../../controllers/document.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Document Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// List all documents
router.get('/', DocumentController.list);

// Create document metadata
router.post('/', mutationRateLimiter, DocumentController.create);

// Update document metadata
router.put('/:id', mutationRateLimiter, DocumentController.update);

// Delete document metadata
router.delete('/:id', mutationRateLimiter, DocumentController.delete);

export default router;
