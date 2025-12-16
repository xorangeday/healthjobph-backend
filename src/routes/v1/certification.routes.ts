import { Router } from 'express';
import { CertificationController } from '../../controllers/certification.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { mutationRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

/**
 * Certification Routes
 * All routes require authentication
 */

router.use(authenticateJWT);

// Get all certifications
router.get('/', CertificationController.getCertifications);

// Create certification
router.post('/', mutationRateLimiter, CertificationController.createCertification);

// Update certification
router.put('/:certificationId', mutationRateLimiter, CertificationController.updateCertification);

// Delete certification
router.delete('/:certificationId', mutationRateLimiter, CertificationController.deleteCertification);

export default router;
