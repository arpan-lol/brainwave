import { Router } from 'express';
import { ValidationController } from '../controllers/ValidationController.js';

const router = Router();
const validationController = new ValidationController();

router.post('/validate', validationController.validate.bind(validationController));
router.post('/validate/auto-fix', validationController.autoFix.bind(validationController));

export default router;
