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
} from "../types.js";
import { getPlatformRules } from "../creative/platform-rules.js";
import { VALIDATION_LLM_PROMPT } from "../../prompts/validation.prompts.js";

import { createLazyModel } from "../model-factory.js";

const ValidationLLMSchema = z.object({
  violations: z.array(z.object({
    rule: z.string(),
    severity: z.enum(["critical", "warning"]),
    element: z.string().optional(),
    message: z.string(),
    autoFixAvailable: z.boolean().optional(),
  })),
  warnings: z.array(z.any()),
  suggestions: z.array(z.string()),
});

const getModel = createLazyModel(
  { model: "gemini-2.5-flash", temperature: 0 },
  ValidationLLMSchema
);

// non llm

function fastValidate(canvasState: CanvasState, platform: Platform): ValidationError[] {
  const rules = getPlatformRules(platform);
  const errors: ValidationError[] = [];

  // Check background color
  if (rules.requiredBgColor && canvasState.background?.color !== rules.requiredBgColor) {
    errors.push({
      rule: "bg_color",
      severity: "critical",
      message: `Background color must be ${rules.requiredBgColor}`,
      autoFixAvailable: true,
    });
  }

  // Check dimensions
  if (canvasState.width !== rules.dimensions.width || 
      canvasState.height !== rules.dimensions.height) {
    errors.push({
      rule: "dimensions",
      severity: "critical",
      message: `Dimensions must be ${rules.dimensions.width}x${rules.dimensions.height}`,
      autoFixAvailable: false,
    });
  }

  // Check text elements for font size
  const textElements = canvasState.elements.filter(el => el.type === "text");
  textElements.forEach(el => {
    const fontSize = el.style?.fontSize || 0;
    if (rules.text.minFontSize && fontSize < rules.text.minFontSize) {
      errors.push({
        rule: "font_size",
        severity: "warning",
        element: el.id,
        message: `Font size must be at least ${rules.text.minFontSize}px`,
        autoFixAvailable: true,
      });
    }
  });

  // Check number of text lines
  if (rules.text.maxLines && textElements.length > rules.text.maxLines) {
    errors.push({
      rule: "text_lines",
      severity: "warning",
      message: `Maximum ${rules.text.maxLines} text lines allowed`,
      autoFixAvailable: false,
    });
  }

  return errors;
}

// llm validation

async function llmValidate(
  canvasState: CanvasState,
  platform: Platform,
  tier1Errors: ValidationError[]
): Promise<ValidationError[]> {
  const rules = getPlatformRules(platform);
  const elementsSummary = canvasState.elements.map(el => ({
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  }));

  const prompt = VALIDATION_LLM_PROMPT(
    platform,
    canvasState.width,
    canvasState.height,
    JSON.stringify(elementsSummary, null, 2),
    tier1Errors.length > 0 ? JSON.stringify(tier1Errors) : "None",
    rules.product.minCoverage || 60,
    rules.product.maxCoverage || 80
  );

  try {
    const response = await getModel().invoke([
      new SystemMessage(prompt),
      new HumanMessage("Please validate this design."),
    ]) as z.infer<typeof ValidationLLMSchema>;

    const llmErrors: ValidationError[] = [
      ...response.violations,
      ...response.warnings,
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
  }),
  platform: z.enum(["amazon", "walmart", "flipkart"]),
  validationResult: z.any().optional(),
  messages: MessagesValue,
});

// Graph Nodes 

// Tier 1 validation node
async function tier1ValidationNode(state: ValidationState): Promise<Partial<ValidationState>> {
  const errors = fastValidate(state.canvasState, state.platform);

  return {
    validationResult: {
      violations: errors.filter(e => e.severity === "critical"),
      warnings: errors.filter(e => e.severity === "warning"),
      autoFixes: [],
      isCompliant: errors.length === 0,
      tier: "rule-engine",
    },
  };
}

// Tier 2 validation node (LLM)
async function tier2ValidationNode(state: ValidationState): Promise<Partial<ValidationState>> {
  const tier1Result = state.validationResult!;
  const tier1Errors = [...tier1Result.violations, ...tier1Result.warnings];
  
  const llmErrors = await llmValidate(state.canvasState, state.platform, tier1Errors);
  
  const allViolations = [
    ...tier1Result.violations,
    ...llmErrors.filter(e => e.severity === "critical"),
  ];
  const allWarnings = [
    ...tier1Result.warnings,
    ...llmErrors.filter(e => e.severity === "warning"),
  ];

  return {
    validationResult: {
      violations: allViolations,
      warnings: allWarnings,
      autoFixes: [],
      isCompliant: allViolations.length === 0,
      tier: "llm",
    },
  };
}

// edge

function shouldRunTier2(state: any): string {
  const result = state.validationResult!;
  
  // Only run LLM validation if there are no critical errors from Tier 1
  const hasCriticalErrors = result.violations.length > 0;
  
  if (hasCriticalErrors) {
    return END;
  }
  
  return "tier2";
}

// build the Validation Graph
export const validationGraph = new StateGraph(ValidationStateSchema)
  .addNode("tier1", tier1ValidationNode)
  .addNode("tier2", tier2ValidationNode)
  .addEdge(START, "tier1")
  .addConditionalEdges("tier1", shouldRunTier2, ["tier2", END])
  .addEdge("tier2", END)
  .compile();

export async function validateDesign(
  canvasState: CanvasState,
  platform: Platform
): Promise<ValidationResult> {
  const result = await validationGraph.invoke({
    canvasState,
    platform,
    messages: [],
  });

  if (!result.validationResult) {
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
        fixedCanvas.background = {
          ...fixedCanvas.background,
          color: "#FFFFFF",
        };
        break;
      
      case "font_size":
        if (violation.element) {
          fixedCanvas.elements = fixedCanvas.elements.map(el => {
            if (el.id === violation.element) {
              return {
                ...el,
                style: {
                  ...el.style,
                  fontSize: 14,
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
