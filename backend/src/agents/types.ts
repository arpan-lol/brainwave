import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";

export type Platform = "amazon" | "walmart" | "flipkart";

export const RouterCategorySchema = z.enum(["creative", "validate", "combined", "optimize"]);
export type RouterCategory = z.infer<typeof RouterCategorySchema>;

export type RouterSubIntent = 
  | "image_generation" 
  | "text_creation" 
  | "layout_design" 
  | "color_scheme"
  | "background_removal"
  | "compliance_check"
  | "brand_validation"
  | "size_validation"
  | "content_validation"
  | "generate_and_validate"
  | "performance_optimization"
  | "visual_enhancement"
  | "accessibility_improvement";

export const RouterOutputSchema = z.object({
  category: RouterCategorySchema,
  subIntent: z.string().optional(),
  platform: z.string(),
  params: z.object({
    targetElement: z.string().optional(),
    imagePrompt: z.string().optional(),
    textContent: z.string().optional(),
    colorScheme: z.array(z.string()).optional(),
    layoutType: z.string().optional(),
  }).passthrough(),
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean().optional(),
  clarificationQuestion: z.string().optional(),
});
export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export interface RouterState {
  canvasState: CanvasState;
  userRequest: string;
  routerOutput?: RouterOutput;
  analysisMetadata?: {
    detectedKeywords: string[];
    platformConfidence: number;
    intentConfidence: number;
  };
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
  metadata?: {
    isCritical?: boolean;
    isProduct?: boolean;
    isBrandElement?: boolean;
    layer?: number;
  };
}

export interface CanvasState {
  width: number;
  height: number;
  elements: CanvasElement[];
  background?: {
    color?: string;
    image?: string;
  };
  metadata?: {
    lastModified?: string;
    version?: number;
    brand?: string;
  };
}

export enum CreativeAgentPhase {
  ANALYZE = "analyze",
  PLAN = "plan",
  GENERATE = "generate",
  REVIEW = "review",
  APPLY = "apply",
}

export type GenerationMode = "quick" | "standard" | "comprehensive";

export interface DesignOption {
  id: string;
  elements: CanvasElement[];
  complianceReasoning: string;
  confidence: number;
  modifications: string[];
  brandConsistencyScore?: number;
  estimatedImpact?: "minor" | "moderate" | "major";
  preservedElements?: string[];
}

export const DesignOptionsSchema = z.object({
  options: z.array(
    z.object({
      id: z.string(),
      elements: z.array(z.any()),
      complianceReasoning: z.string(),
      confidence: z.number(),
      modifications: z.array(z.string()),
      brandConsistencyScore: z.number().optional(),
      estimatedImpact: z.enum(["minor", "moderate", "major"]).optional(),
      preservedElements: z.array(z.string()).optional(),
    })
  ),
});

export interface CreativeState {
  canvasState: CanvasState;
  platform: Platform;
  userRequest: string;
  phase: CreativeAgentPhase;
  generationMode: GenerationMode;
  designOptions: DesignOption[];
  selectedOption?: DesignOption;
  platformRules?: PlatformRules;
  requiresHITL: boolean;
  hitlReason?: string[];
  brandContext?: BrandContext;
  iterationCount: number;
  messages: BaseMessage[];
}

export interface BrandContext {
  name?: string;
  colors: string[];
  fonts: string[];
  logoUrl?: string;
  consistencyScore: number;
}

export type ValidationSeverity = "critical" | "high" | "medium" | "low";

export interface ValidationError {
  rule: string;
  severity: ValidationSeverity;
  element?: string;
  message: string;
  autoFixAvailable?: boolean;
  severityScore?: number;
  category?: "visual" | "text" | "product" | "brand" | "compliance" | "performance";
}

export type ValidationTier = "instant" | "rule_engine" | "llm" | "comprehensive";

export interface ValidationResult {
  violations: ValidationError[];
  warnings: ValidationError[];
  autoFixes: AutoFix[];
  isCompliant: boolean;
  tier: ValidationTier;
  overallScore?: number;
  timestamp: string;
  suggestions?: string[];
}

export interface AutoFix {
  rule: string;
  description: string;
  confidence: number;
  canApplyAutomatically: boolean;
  apply: () => CanvasState;
}

export interface ValidationState {
  canvasState: CanvasState;
  platform: Platform;
  tier: ValidationTier;
  validationResult?: ValidationResult;
  progressiveResults?: Partial<ValidationResult>[];
  messages: BaseMessage[];
}

export interface PlatformRules {
  platform: Platform;
  displayName?: string;
  requiredBgColor?: string;
  allowedBgColors?: string[];
  dimensions: {
    width: number;
    height: number;
    aspectRatio?: string;
  };
  fileSize: {
    maxMB: number;
    minMB?: number;
  };
  fileFormats?: string[];
  dpi?: {
    min: number;
    recommended: number;
  };
  text: {
    maxLines?: number;
    minFontSize?: number;
    maxFontSize?: number;
    allowedFonts?: string[];
    maxCharacters?: number;
    lineHeightRatio?: number;
    textToImageRatio?: {
      min: number;
      max: number;
    };
    readability?: {
      minContrastRatio: number;
      avoidOverlappingProduct: boolean;
    };
  };
  product: {
    minCoverage?: number;
    maxCoverage?: number;
    minVisibility?: number;
    centerAlignmentTolerance?: number;
    backgroundRemovalRequired?: boolean;
    showMultipleAngles?: boolean;
    minResolution?: number;
  };
  brand?: {
    colors: string[];
    logoRequired?: boolean;
    logoMaxSizePercent?: number;
    logoPositions?: string[];
    brandConsistencyScoreMin?: number;
  };
  compliance?: {
    prohibitedContent: string[];
    requiredDisclaimers: string[];
    trademarkClearance: boolean;
    accessibility: {
      altTextRequired: boolean;
      colorBlindSafe: boolean;
    };
  };
  performance?: {
    clickThroughZones: string[];
    recommendedCtaPosition: string;
    ctaMinSize: {
      width: number;
      height: number;
    };
  };
  seasonalRules?: {
    holidayThemesAllowed: boolean;
    seasonalColorVariations: boolean;
  };
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
  skipFutureReviews?: boolean;
}

export interface WorkflowConfig {
  router: {
    confidenceThresholds: {
      high: number;
      medium: number;
      low: number;
    };
    requireClarificationThreshold: number;
  };
  creative: {
    generationModes: Record<GenerationMode, {
      optionsCount: number;
      maxIterations: number;
      skipReview: boolean;
    }>;
    hitlTriggers: {
      multipleOptions: boolean;
      lowConfidence: number;
      majorChangesThreshold: number;
    };
  };
  validation: {
    severityLevels: Record<ValidationSeverity, {
      score: number;
      blockExport: boolean;
    }>;
    autoFix: {
      enabled: boolean;
      confidenceThreshold: number;
    };
  };
}

