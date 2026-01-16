import { Request, Response } from 'express';
import { routeRequest } from '../agents/router/index.js';
import { runCreativeAgent } from '../agents/creative/index.js';
import { validateDesign } from '../agents/validation/index.js';
import { Platform, CanvasState } from '../agents/types.js';

export class WorkflowController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { canvasState, userRequest } = req.body;
      
      if (!canvasState || !userRequest) {
        res.status(400).json({ 
          error: 'Missing required fields: canvasState, userRequest' 
        });
        return;
      }

      const routerOutput = await routeRequest(canvasState, userRequest);
      
      let creativeResult = null;
      let validationResult = null;

      if (routerOutput.category === 'creative' || routerOutput.category === 'combined') {
        creativeResult = await runCreativeAgent(
          canvasState as CanvasState,
          routerOutput.platform as Platform,
          userRequest
        );
      }

      if (routerOutput.category === 'validate' || routerOutput.category === 'combined') {
        const canvasToValidate = creativeResult?.canvasState || canvasState;
        validationResult = await validateDesign(
          canvasToValidate as CanvasState,
          routerOutput.platform as Platform
        );
      }

      res.json({
        success: true,
        data: {
          routing: routerOutput,
          creative: creativeResult ? {
            canvasState: creativeResult.canvasState,
            designOptions: creativeResult.designOptions,
            requiresHITL: creativeResult.requiresHITL,
          } : null,
          validation: validationResult,
        },
      });
    } catch (error) {
      console.error('Workflow error:', error);
      res.status(500).json({ 
        error: 'Failed to execute workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
