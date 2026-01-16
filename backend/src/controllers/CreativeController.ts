import { Request, Response } from 'express';
import { runCreativeAgent } from '../agents/creative/index.js';
import { Platform, CanvasState } from '../agents/types.js';

export class CreativeController {
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { canvasState, platform, userRequest } = req.body;
      
      if (!canvasState || !platform || !userRequest) {
        res.status(400).json({ 
          error: 'Missing required fields: canvasState, platform, userRequest' 
        });
        return;
      }

      if (!['amazon', 'walmart', 'flipkart'].includes(platform)) {
        res.status(400).json({ 
          error: 'Invalid platform. Must be one of: amazon, walmart, flipkart' 
        });
        return;
      }

      const result = await runCreativeAgent(
        canvasState as CanvasState,
        platform as Platform,
        userRequest
      );
      
      res.json({
        success: true,
        data: {
          canvasState: result.canvasState,
          designOptions: result.designOptions,
          selectedOption: result.selectedOption,
          requiresHITL: result.requiresHITL,
          phase: result.phase,
        },
      });
    } catch (error) {
      console.error('Creative agent error:', error);
      res.status(500).json({ 
        error: 'Failed to run creative agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
