import { Request, Response } from 'express';
import { routeRequest } from '../agents/router/index.js';

export class RouterController {
  async route(req: Request, res: Response): Promise<void> {
    try {
      const { canvasState, userRequest } = req.body;
      
      if (!canvasState || !userRequest) {
        res.status(400).json({ 
          error: 'Missing required fields: canvasState, userRequest' 
        });
        return;
      }

      const routerOutput = await routeRequest(canvasState, userRequest);
      
      res.json({
        success: true,
        data: routerOutput,
      });
    } catch (error) {
      console.error('Router error:', error);
      res.status(500).json({ 
        error: 'Failed to route request',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
