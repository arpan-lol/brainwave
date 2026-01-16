import { Request, Response } from 'express';
import { validateDesign, autoFixViolations } from '../agents/validation/index.js';
import { Platform, CanvasState } from '../agents/types.js';

export class ValidationController {
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { canvasState, platform } = req.body;
      
      if (!canvasState || !platform) {
        res.status(400).json({ 
          error: 'Missing required fields: canvasState, platform' 
        });
        return;
      }

      if (!['amazon', 'walmart', 'flipkart'].includes(platform)) {
        res.status(400).json({ 
          error: 'Invalid platform. Must be one of: amazon, walmart, flipkart' 
        });
        return;
      }

      const validationResult = await validateDesign(
        canvasState as CanvasState,
        platform as Platform
      );
      
      res.json({
        success: true,
        data: validationResult,
      });
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate design',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async autoFix(req: Request, res: Response): Promise<void> {
    try {
      const { canvasState, violations } = req.body;
      
      if (!canvasState || !violations) {
        res.status(400).json({ 
          error: 'Missing required fields: canvasState, violations' 
        });
        return;
      }

      const fixedCanvas = autoFixViolations(
        canvasState as CanvasState,
        violations
      );
      
      res.json({
        success: true,
        data: {
          canvasState: fixedCanvas,
        },
      });
    } catch (error) {
      console.error('Auto-fix error:', error);
      res.status(500).json({ 
        error: 'Failed to auto-fix violations',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
