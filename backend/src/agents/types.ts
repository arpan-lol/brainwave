import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";

export type Platform = "amazon" | "walmart" | "flipkart";

export const RouterCategorySchema = z.enum(["creative", "validate", "combined"]);
export type RouterCategory = z.infer<typeof RouterCategorySchema>;

export const RouterOutputSchema = z.object({
  category: RouterCategorySchema,
  platform: z.string(),
  params: z.object({
    targetElement: z.string().optional(),
    imagePrompt: z.string().optional(),
    textContent: z.string().optional(),
  }).passthrough(),
  confidence: z.number().min(0).max(1),
});
export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export interface RouterState {
  canvasState: CanvasState;
  userRequest: string;
  routerOutput?: RouterOutput;
  messages: BaseMessage[];
}

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "shape" | "background";
  x: number;
  y: number;
  width: number;
  height: number;
  style?: Record<string, any>;
  content?: string;
  src?: string;
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

export enum CreativeAgentPhase {
  PARSE = "parse",
  PLAN = "plan",
  GENERATE = "generate",
  HITL = "hitl",
  APPLY = "apply",
}

export interface DesignOption {
  id: string;
  elements: CanvasElement[];
  complianceReasoning: string;
  confidence: number;
  modifications: string[];
}

export const DesignOptionsSchema = z.object({
  options: z.array(
    z.object({
      id: z.string(),
      elements: z.array(z.any()),
      complianceReasoning: z.string(),
      confidence: z.number(),
      modifications: z.array(z.string()),
    })
  ),
});

export interface CreativeState {
  canvasState: CanvasState;
  platform: Platform;
  userRequest: string;
  phase: CreativeAgentPhase;
  designOptions: DesignOption[];
  selectedOption?: DesignOption;
  platformRules?: PlatformRules;
  requiresHITL: boolean;
  messages: BaseMessage[];
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
  autoFixes: AutoFix[];
  isCompliant: boolean;
  tier: "rule-engine" | "llm";
}

export interface AutoFix {
  rule: string;
  description: string;
  apply: () => CanvasState;
}

export interface ValidationState {
  canvasState: CanvasState;
  platform: Platform;
  validationResult?: ValidationResult;
  messages: BaseMessage[];
}

export interface PlatformRules {
  platform: Platform;
  requiredBgColor?: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: {
    maxMB: number;
  };
  text: {
    maxLines?: number;
    minFontSize?: number;
    allowedFonts?: string[];
  };
  product: {
    minCoverage?: number; // percentage 0-100
    maxCoverage?: number;
  };
  brandColors?: string[];
}

export const ImageGenerationParamsSchema = z.object({
  prompt: z.string(),
  width: z.number(),
  height: z.number(),
});

export const RemoveBackgroundParamsSchema = z.object({
  imageUrl: z.string(),
});

export const ColorPaletteParamsSchema = z.object({
  brand: z.string(),
  platform: z.string(),
});

export interface HITLDecision {
  approved: boolean;
  feedback?: string;
  selectedOptionId?: string;
}
