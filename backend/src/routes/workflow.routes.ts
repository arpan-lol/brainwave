import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController.js';

const router = Router();
const workflowController = new WorkflowController();

router.post('/workflow', workflowController.execute.bind(workflowController));

export default router;
