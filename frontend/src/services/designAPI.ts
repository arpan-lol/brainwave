import { fabric } from "fabric";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type Platform = "amazon" | "walmart" | "flipkart";
export type DesignCategory = "creative" | "validate" | "combined";

export interface CanvasElement {
  id?: string;
  type: "text" | "image" | "shape" | "background";
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  src?: string;
  style?: Record<string, any>;
  content?: string;
  customId?: string;
  isVarnishTag?: boolean;
  isLogo?: boolean;
  isBackground?: boolean;
  stickerType?: string;
}

export interface CanvasState {
  width: number;
  height: number;
  elements: CanvasElement[];
  background?: {
    color?: string;
    image?: string;
  };
}

export interface DesignOption {
  id: string;
  elements: CanvasElement[];
  complianceReasoning: string;
  confidence: number;
  modifications: string[];
}

export interface ValidationError {
  rule: string;
  severity: "critical" | "warning";
  element?: string;
  message: string;
  autoFixAvailable?: boolean;
}

export interface ValidationResult {
  violations: ValidationError[];
  warnings: ValidationError[];
  autoFixes?: any[];
  isCompliant: boolean;
  tier?: "rule-engine" | "llm";
}

export interface DesignRequest {
  canvasState: CanvasState;
  userRequest: string;
  platform?: Platform;
  design_id?: string;
  campaign_type?: string;
  user_keywords?: string[];
  user_settings?: {
    review_before_export?: boolean;
  };
}

export interface DesignResponse {
  success: boolean;
  data: {
    routing: {
      category: DesignCategory;
      platform: string;
      params: Record<string, any>;
      confidence: number;
    };
    creative: {
      canvasState: CanvasState;
      designOptions: DesignOption[];
      requiresHITL: boolean;
    } | null;
    validation: ValidationResult | null;
  };
}

export interface ContinueRequest {
  thread_id: string;
  selected_option: number;
  modifications?: any;
}

export interface ContinueResponse {
  success: boolean;
  modifications: {
    add: CanvasElement[];
    modify: Array<{ id: string; changes: Partial<CanvasElement> }>;
    remove: string[];
  };
  validation: ValidationResult;
}

export class DesignAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async executeDesignRequest(request: DesignRequest): Promise<DesignResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Design request failed:', error);
      throw error;
    }
  }

  async selectOption(threadId: string, optionIndex: number, modifications?: any): Promise<ContinueResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/design/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
          selected_option: optionIndex,
          modifications,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Option selection failed:', error);
      throw error;
    }
  }

  async validateCanvas(canvasState: CanvasState, platform: Platform): Promise<DesignResponse> {
    return this.executeDesignRequest({
      canvasState,
      userRequest: `Validate this design for ${platform} compliance`,
      platform,
    });
  }

  fabricCanvasToState(canvas: fabric.Canvas): CanvasState {
    const objects = canvas.getObjects();
    
    const elements: CanvasElement[] = objects.map((obj: any) => {
      const element: CanvasElement = {
        id: obj.customId || obj.id || Math.random().toString(36).substr(2, 9),
        type: this.getFabricObjectType(obj),
        left: obj.left || 0,
        top: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        customId: obj.customId,
        isVarnishTag: obj.isVarnishTag,
        isLogo: obj.isLogo,
        isBackground: obj.isBackground,
        stickerType: obj.stickerType,
      };

      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        element.text = obj.text;
        element.fontSize = obj.fontSize;
        element.fill = obj.fill;
        element.fontFamily = obj.fontFamily;
      }

      if (obj.type === 'image') {
        element.src = obj.src || obj.getSrc?.();
      }

      return element;
    });

    return {
      width: canvas.width || 800,
      height: canvas.height || 600,
      elements,
      background: {
        color: typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : undefined,
      },
    };
  }

  private getFabricObjectType(obj: any): CanvasElement['type'] {
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      return 'text';
    }
    if (obj.type === 'image') {
      return 'image';
    }
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'polygon') {
      return 'shape';
    }
    return 'shape';
  }

  applyElementsToCanvas(canvas: fabric.Canvas, elements: CanvasElement[]): void {
    elements.forEach((element) => {
      if (element.type === 'text' && element.text) {
        const text = new fabric.Textbox(element.text, {
          left: element.left || element.x || 0,
          top: element.top || element.y || 0,
          fontSize: element.fontSize || 20,
          fill: element.fill || '#000000',
          fontFamily: element.fontFamily || 'Arial',
          width: element.width || 200,
        });
        (text as any).customId = element.id || element.customId;
        canvas.add(text);
      } else if (element.type === 'image' && element.src) {
        fabric.Image.fromURL(element.src, (img) => {
          img.set({
            left: element.left || element.x || 0,
            top: element.top || element.y || 0,
            scaleX: element.width ? element.width / (img.width || 1) : 1,
            scaleY: element.height ? element.height / (img.height || 1) : 1,
          });
          (img as any).customId = element.id || element.customId;
          canvas.add(img);
          canvas.renderAll();
        });
      }
    });
    canvas.renderAll();
  }
}

export const designAPI = new DesignAPI();
