import { Router } from 'express';
import routerRoutes from './router.routes.js';
import creativeRoutes from './creative.routes.js';
import validationRoutes from './validation.routes.js';
import workflowRoutes from './workflow.routes.js';

const router = Router();

router.use(routerRoutes);
router.use(creativeRoutes);
router.use(validationRoutes);
router.use(workflowRoutes);

export default router;
