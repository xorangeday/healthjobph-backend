import { Router } from 'express';
import profileRoutes from './profile.routes';
import jobRoutes from './job.routes';
import employerRoutes from './employer.routes';
import educationRoutes from './education.routes';
import experienceRoutes from './experience.routes';
import certificationRoutes from './certification.routes';
import savedJobRoutes from './saved-job.routes';
import dashboardRoutes from './dashboard.routes';
import applicationRoutes from './application.routes';
import documentRoutes from './document.routes';

import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/jobs', jobRoutes);
router.use('/employer', employerRoutes);
router.use('/education', educationRoutes);
router.use('/experience', experienceRoutes);
router.use('/certifications', certificationRoutes);
router.use('/saved-jobs', savedJobRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/applications', applicationRoutes);
router.use('/documents', documentRoutes);

export default router;
