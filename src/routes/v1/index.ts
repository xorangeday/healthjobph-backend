import { Router } from 'express';
import profileRoutes from './profile.routes';
import jobRoutes from './job.routes';
import employerRoutes from './employer.routes';
import educationRoutes from './education.routes';
import experienceRoutes from './experience.routes';
import certificationRoutes from './certification.routes';
import savedJobRoutes from './saved-job.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/profile', profileRoutes);
router.use('/jobs', jobRoutes);
router.use('/employer', employerRoutes);
router.use('/education', educationRoutes);
router.use('/experience', experienceRoutes);
router.use('/certifications', certificationRoutes);
router.use('/saved-jobs', savedJobRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
