import { Router } from 'express';
import { RouterController } from '../controllers/RouterController.js';

const router = Router();
const routerController = new RouterController();

router.post('/route', routerController.route.bind(routerController));

export default router;
