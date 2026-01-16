import { Router } from 'express';
import { CreativeController } from '../controllers/CreativeController.js';

const router = Router();
const creativeController = new CreativeController();

router.post('/creative', creativeController.generate.bind(creativeController));

export default router;
