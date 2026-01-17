import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import {
  ValidationState,
  ValidationResult,
  ValidationError,
  Platform,
  CanvasState,
  ValidationTier,
  ValidationSeverity,
} from "../types.js";
import { getPlatformRules } from "../creative/platform-rules.js";
import { VALIDATION_INSTANT_PROMPT, VALIDATION_LLM_PROMPT, VALIDATION_COMPREHENSIVE_PROMPT } from "../../prompts/validation.prompts.js";
import { createLazyModel } from "../model-factory.js";
import { getValidationConfig } from "../../config/config-loader.js";

const ValidationLLMSchema = z.object({
  violations: z.array(z.object({
    rule: z.string(),
    severity: z.enum(["critical", "high", "medium", "low"]),
    element: z.string().optional(),
    message: z.string(),
    autoFixAvailable: z.boolean().optional(),
    category: z.enum(["visual", "text", "product", "brand", "compliance", "performance"]).optional(),
  })),
  warnings: z.array(z.any()),
  suggestions: z.array(z.string()),
});

const getModel = createLazyModel(
  { model: "gemini-2.5-flash", temperature: 0 },
  ValidationLLMSchema
);

function instantValidate(canvasState: CanvasState, platform: Platform): ValidationError[] {
  const config = getValidationConfig();
  const rules = getPlatformRules(platform);
  const errors: ValidationError[] = [];

  if (canvasState.width !== rules.dimensions.width || 
      canvasState.height !== rules.dimensions.height) {
    errors.push({
      rule: "dimensions",
      severity: "critical",
      message: `Dimensions must be ${rules.dimensions.width}x${rules.dimensions.height}`,
      autoFixAvailable: false,
      severityScore: config.severity_levels.critical.score,
      category: "visual",
    });
  }

  return errors;
}

function ruleEngineValidate(canvasState: CanvasState, platform: Platform): ValidationError[] {
  const config = getValidationConfig();
  const rules = getPlatformRules(platform);
  const errors: ValidationError[] = [];

  if (rules.requiredBgColor && canvasState.background?.color !== rules.requiredBgColor) {
    const isAllowed = rules.allowedBgColors?.includes(canvasState.background?.color || "");
    if (!isAllowed) {
      errors.push({
        rule: "bg_color",
        severity: "critical",
        message: `Background color must be one of: ${rules.allowedBgColors?.join(", ")}`,
        autoFixAvailable: true,
        severityScore: config.severity_levels.critical.score,
        category: "visual",
      });
    }
  }

  const textElements = canvasState.elements.filter(el => el.type === "text");
  
  textElements.forEach(el => {
    const fontSize = el.style?.fontSize || 0;
    if (rules.text.minFontSize && fontSize < rules.text.minFontSize) {
      errors.push({
        rule: "font_size",
        severity: "high",
        element: el.id,
        message: `Font size must be at least ${rules.text.minFontSize}px (current: ${fontSize}px)`,
        autoFixAvailable: true,
        severityScore: config.severity_levels.high.score,
        category: "text",
      });
    }

    if (rules.text.maxFontSize && fontSize > rules.text.maxFontSize) {
      errors.push({
        rule: "font_size_max",
        severity: "medium",
        element: el.id,
        message: `Font size should not exceed ${rules.text.maxFontSize}px`,
        autoFixAvailable: true,
        severityScore: config.severity_levels.medium.score,
        category: "text",
      });
    }

    const fontFamily = el.style?.fontFamily;
    if (fontFamily && rules.text.allowedFonts && !rules.text.allowedFonts.includes(fontFamily)) {
      errors.push({
        rule: "font_family",
        severity: "medium",
        element: el.id,
        message: `Font "${fontFamily}" not allowed. Use: ${rules.text.allowedFonts.join(", ")}`,
        autoFixAvailable: true,
        severityScore: config.severity_levels.medium.score,
        category: "text",
      });
    }

    const textLength = el.content?.length || 0;
    if (rules.text.maxCharacters && textLength > rules.text.maxCharacters) {
      errors.push({
        rule: "text_length",
        severity: "medium",
        element: el.id,
        message: `Text too long (${textLength}/${rules.text.maxCharacters} characters)`,
        autoFixAvailable: false,
        severityScore: config.severity_levels.medium.score,
        category: "text",
      });
    }
  });

  if (rules.text.maxLines && textElements.length > rules.text.maxLines) {
    errors.push({
      rule: "text_lines",
      severity: "high",
      message: `Maximum ${rules.text.maxLines} text elements allowed (current: ${textElements.length})`,
      autoFixAvailable: false,
      severityScore: config.severity_levels.high.score,
      category: "text",
    });
  }

  const productElements = canvasState.elements.filter(el => el.metadata?.isProduct);
  if (productElements.length === 0) {
    errors.push({
      rule: "product_missing",
      severity: "critical",
      message: "No product image found in design",
      autoFixAvailable: false,
      severityScore: config.severity_levels.critical.score,
      category: "product",
    });
  }

  return errors;
}

async function llmValidate(
  canvasState: CanvasState,
  platform: Platform,
  previousErrors: ValidationError[]
): Promise<ValidationError[]> {
  const rules = getPlatformRules(platform);
  const config = getValidationConfig();
  
  const elementsSummary = canvasState.elements.map(el => ({
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    isProduct: el.metadata?.isProduct,
    isCritical: el.metadata?.isCritical,
  }));

  const prompt = VALIDATION_LLM_PROMPT(
    platform,
    canvasState.width,
    canvasState.height,
    JSON.stringify(elementsSummary, null, 2),
    previousErrors.length > 0 ? JSON.stringify(previousErrors) : "None",
    rules
  );

  try {
    const response = await getModel().invoke([
      new SystemMessage(prompt),
      new HumanMessage("Please validate this design against subjective and semantic rules."),
    ]) as z.infer<typeof ValidationLLMSchema>;

    const llmErrors: ValidationError[] = [
      ...response.violations.map(v => ({
        ...v,
        severityScore: config.severity_levels[v.severity as ValidationSeverity]?.score || 50,
      })),
      ...response.warnings.map((w: any) => ({
        ...w,
        severityScore: config.severity_levels[w.severity as ValidationSeverity]?.score || 25,
      })),
    ];

    return llmErrors;
  } catch (error) {
    console.error("Failed to run LLM validation:", error);
    return [];
  }
}

const ValidationStateSchema = new StateSchema({
  canvasState: z.object({
    width: z.number(),
    height: z.number(),
    elements: z.array(z.any()),
    background: z.any().optional(),
    metadata: z.any().optional(),
  }),
  platform: z.enum(["amazon", "walmart", "flipkart"]),
  tier: z.enum(["instant", "rule_engine", "llm", "comprehensive"]),
  validationResult: z.any().optional(),
  progressiveResults: z.array(z.any()).optional(),
  messages: MessagesValue,
});

async function instantValidationNode(state: ValidationState): Promise<Partial<ValidationState>> {
  const errors = instantValidate(state.canvasState, state.platform);

  return {
    progressiveResults: [{
      violations: errors.filter(e => e.severity === "critical"),
      warnings: errors.filter(e => e.severity !== "critical"),
      autoFixes: [],
      isCompliant: errors.length === 0,
      tier: "instant" as ValidationTier,
      timestamp: new Date().toISOString(),
    }],
  };
}

async function ruleEngineValidationNode(state: ValidationState): Promise<Partial<ValidationState>> {
  const errors = ruleEngineValidate(state.canvasState, state.platform);
  const previousErrors = state.progressiveResults?.[0]?.violations || [];
  
  const allErrors = [...previousErrors, ...errors];

  return {
    progressiveResults: [
      ...(state.progressiveResults || []),
      {
        violations: allErrors.filter(e => e.severity === "critical" || e.severity === "high"),
        warnings: allErrors.filter(e => e.severity === "medium" || e.severity === "low"),
        autoFixes: [],
        isCompliant: allErrors.filter(e => e.severity === "critical").length === 0,
        tier: "rule_engine" as ValidationTier,
        timestamp: new Date().toISOString(),
      }
    ],
  };
}

async function llmValidationNode(state: ValidationState): Promise<Partial<ValidationState>> {
  const previousResults = state.progressiveResults?.[state.progressiveResults.length - 1];
  const previousErrors = [
    ...(previousResults?.violations || []),
    ...(previousResults?.warnings || []),
  ];
  
  const llmErrors = await llmValidate(state.canvasState, state.platform, previousErrors);
  
  const allViolations = [
    ...previousErrors.filter(e => e.severity === "critical" || e.severity === "high"),
    ...llmErrors.filter(e => e.severity === "critical" || e.severity === "high"),
  ];
  
  const allWarnings = [
    ...previousErrors.filter(e => e.severity === "medium" || e.severity === "low"),
    ...llmErrors.filter(e => e.severity === "medium" || e.severity === "low"),
  ];

  const overallScore = calculateComplianceScore(allViolations, allWarnings);

  return {
    validationResult: {
      violations: allViolations,
      warnings: allWarnings,
      autoFixes: generateAutoFixes(allViolations, allWarnings, state.canvasState),
      isCompliant: allViolations.length === 0,
      tier: "llm" as ValidationTier,
      overallScore,
      timestamp: new Date().toISOString(),
      suggestions: [],
    },
  };
}

function calculateComplianceScore(violations: ValidationError[], warnings: ValidationError[]): number {
  const maxScore = 100;
  let deductions = 0;

  violations.forEach(v => {
    deductions += v.severityScore || 0;
  });

  warnings.forEach(w => {
    deductions += (w.severityScore || 0) * 0.5;
  });

  return Math.max(0, maxScore - deductions);
}

function generateAutoFixes(
  violations: ValidationError[],
  warnings: ValidationError[],
  canvasState: CanvasState
): any[] {
  const config = getValidationConfig();
  const fixes: any[] = [];

  if (!config.auto_fix.enabled) {
    return fixes;
  }

  const allErrors = [...violations, ...warnings];
  
  allErrors.forEach(error => {
    if (!error.autoFixAvailable) return;
    
    if (config.auto_fix.fixable_rules.includes(error.rule)) {
      fixes.push({
        rule: error.rule,
        description: `Auto-fix: ${error.message}`,
        confidence: 0.85,
        canApplyAutomatically: true,
        apply: () => autoFixViolations(canvasState, [error]),
      });
    }
  });

  return fixes;
}

function shouldRunLLM(state: any): string {
  const result = state.progressiveResults?.[state.progressiveResults.length - 1];
  
  const hasCriticalErrors = (result?.violations || []).some(
    (v: ValidationError) => v.severity === "critical"
  );
  
  if (hasCriticalErrors) {
    return "llm";
  }
  
  if (state.tier === "comprehensive") {
    return "llm";
  }

  return END;
}

export const validationGraph = new StateGraph(ValidationStateSchema)
  .addNode("instant", instantValidationNode)
  .addNode("rule_engine", ruleEngineValidationNode)
  .addNode("llm", llmValidationNode)
  .addEdge(START, "instant")
  .addEdge("instant", "rule_engine")
  .addConditionalEdges("rule_engine", shouldRunLLM, ["llm", END])
  .addEdge("llm", END)
  .compile();

export async function validateDesign(
  canvasState: CanvasState,
  platform: Platform,
  tier: ValidationTier = "rule_engine"
): Promise<ValidationResult> {
  const result = await validationGraph.invoke({
    canvasState,
    platform,
    tier,
    progressiveResults: [],
    messages: [],
  });

  if (!result.validationResult) {
    const progressResults = result.progressiveResults as any[] | undefined;
    if (progressResults && progressResults.length > 0) {
      return progressResults[progressResults.length - 1] as ValidationResult;
    }
    throw new Error("Validation failed to produce result");
  }

  return result.validationResult as ValidationResult;
}

export function autoFixViolations(
  canvasState: CanvasState,
  violations: ValidationError[]
): CanvasState {
  let fixedCanvas = { ...canvasState };

  violations.forEach(violation => {
    if (!violation.autoFixAvailable) return;

    switch (violation.rule) {
      case "bg_color":
        const bgRules = getPlatformRules((fixedCanvas.metadata as any)?.platform || "amazon");
        fixedCanvas.background = {
          ...fixedCanvas.background,
          color: bgRules.requiredBgColor,
        };
        break;
      
      case "font_size":
        if (violation.element) {
          const fontRules = getPlatformRules((fixedCanvas.metadata as any)?.platform || "amazon");
          fixedCanvas.elements = fixedCanvas.elements.map(el => {
            if (el.id === violation.element) {
              return {
                ...el,
                style: {
                  ...el.style,
                  fontSize: fontRules.text.minFontSize,
                },
              };
            }
            return el;
          });
        }
        break;

      case "font_family":
        if (violation.element) {
          const familyRules = getPlatformRules((fixedCanvas.metadata as any)?.platform || "amazon");
          fixedCanvas.elements = fixedCanvas.elements.map(el => {
            if (el.id === violation.element) {
              return {
                ...el,
                style: {
                  ...el.style,
                  fontFamily: familyRules.text.allowedFonts?.[0],
                },
              };
            }
            return el;
          });
        }
        break;
    }
  });

  return fixedCanvas;
}

