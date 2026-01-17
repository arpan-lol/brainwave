import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  CreativeState,
  CreativeAgentPhase,
  DesignOption,
  Platform,
  PlatformRules,
  CanvasState,
  DesignOptionsSchema,
  GenerationMode,
  BrandContext,
} from "../types.js";
import { getPlatformRules } from "./platform-rules.js";
import { CREATIVE_ANALYZE_PROMPT, CREATIVE_PLAN_PROMPT, CREATIVE_GENERATE_PROMPT } from "../../prompts/creative.prompts.js";
import { createLazyModel } from "../model-factory.js";
import { getCreativeConfig } from "../../config/config-loader.js";

const getModel = createLazyModel(
  { model: "gemini-2.5-flash", temperature: 0.7 },
  DesignOptionsSchema
);

const generateImageTool = tool(
  async ({ prompt, width, height }) => {
    console.log(`Generating image: ${prompt} (${width}x${height})`);
    return {
      url: `https://placeholder.com/${width}x${height}`,
      width,
      height,
    };
  },
  {
    name: "generate_image",
    description: "Generate an image using AI based on a text prompt",
    schema: z.object({
      prompt: z.string().describe("Text prompt describing the image to generate"),
      width: z.number().describe("Image width in pixels"),
      height: z.number().describe("Image height in pixels"),
    }),
  }
);

const removeBackgroundTool = tool(
  async ({ imageUrl }) => {
    console.log(`Removing background from: ${imageUrl}`);
    return {
      url: imageUrl + "?bg-removed=true",
    };
  },
  {
    name: "remove_background",
    description: "Remove background from an image",
    schema: z.object({
      imageUrl: z.string().describe("URL of the image to process"),
    }),
  }
);

const getPlatformRulesTool = tool(
  async ({ platform }) => {
    return getPlatformRules(platform as Platform);
  },
  {
    name: "get_platform_rules",
    description: "Get design rules and requirements for a retail platform",
    schema: z.object({
      platform: z.enum(["amazon", "walmart", "flipkart"]).describe("Retail platform name"),
    }),
  }
);

const suggestColorPaletteTool = tool(
  async ({ brand, platform }) => {
    const palettes: Record<string, string[]> = {
      amazon: ["#FF9900", "#146EB4", "#FFFFFF", "#000000"],
      walmart: ["#0071CE", "#FFC220", "#FFFFFF", "#000000"],
      flipkart: ["#00539F", "#E32526", "#FFFFFF", "#000000"],
    };
    return palettes[platform as Platform] || palettes.amazon;
  },
  {
    name: "suggest_color_palette",
    description: "Suggest brand-compliant color palette for a platform",
    schema: z.object({
      brand: z.string().describe("Brand name"),
      platform: z.string().describe("Retail platform"),
    }),
  }
);

const CreativeStateSchema = new StateSchema({
  canvasState: z.object({
    width: z.number(),
    height: z.number(),
    elements: z.array(z.any()),
    background: z.any().optional(),
    metadata: z.any().optional(),
  }),
  platform: z.enum(["amazon", "walmart", "flipkart"]),
  userRequest: z.string(),
  phase: z.nativeEnum(CreativeAgentPhase),
  generationMode: z.enum(["quick", "standard", "comprehensive"]),
  designOptions: z.array(z.any()),
  selectedOption: z.any().optional(),
  platformRules: z.any().optional(),
  requiresHITL: z.boolean(),
  hitlReason: z.array(z.string()).optional(),
  brandContext: z.any().optional(),
  iterationCount: z.number(),
  messages: MessagesValue,
});

function analyzeBrandContext(canvasState: CanvasState, platformRules: PlatformRules): BrandContext {
  const elements = canvasState.elements;
  const detectedColors: string[] = [];
  const detectedFonts: string[] = [];
  
  elements.forEach(el => {
    if (el.style?.color) detectedColors.push(el.style.color);
    if (el.style?.backgroundColor) detectedColors.push(el.style.backgroundColor);
    if (el.style?.fontFamily) detectedFonts.push(el.style.fontFamily);
  });

  const uniqueColors = [...new Set(detectedColors)];
  const uniqueFonts = [...new Set(detectedFonts)];

  const brandColors = platformRules.brand?.colors || [];
  const colorMatch = uniqueColors.filter(c => brandColors.includes(c)).length;
  const consistencyScore = brandColors.length > 0 ? colorMatch / brandColors.length : 0.5;

  return {
    name: canvasState.metadata?.brand,
    colors: uniqueColors,
    fonts: uniqueFonts,
    consistencyScore,
  };
}

async function analyzeNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const creativeConfig = getCreativeConfig();
  const platformRules = getPlatformRules(state.platform);
  
  const brandContext = analyzeBrandContext(state.canvasState, platformRules);
  
  const criticalElements = state.canvasState.elements.filter(
    el => el.metadata?.isCritical || el.metadata?.isProduct
  );

  console.log(`[Creative Agent] Analyzed canvas: ${state.canvasState.elements.length} elements, brand consistency: ${brandContext.consistencyScore}`);

  return {
    phase: CreativeAgentPhase.PLAN,
    platformRules,
    brandContext,
  };
}

async function planNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const creativeConfig = getCreativeConfig();
  const modeConfig = creativeConfig.generation_modes[state.generationMode];
  
  const elementCount = state.canvasState.elements.length;
  const rules = state.platformRules!;
  
  const topRules = [
    `Background: ${rules.requiredBgColor || "flexible"}`,
    `Dimensions: ${rules.dimensions.width}x${rules.dimensions.height}`,
    `File size: max ${rules.fileSize.maxMB}MB`,
    `Product coverage: ${rules.product.minCoverage || 60}-${rules.product.maxCoverage || 80}%`,
    `Text: max ${rules.text.maxLines} lines, min ${rules.text.minFontSize}px font`,
    `Brand consistency: min ${rules.brand?.brandConsistencyScoreMin || 0.7}`,
  ];

  const prompt = CREATIVE_PLAN_PROMPT(
    state.platform,
    elementCount,
    state.canvasState.width,
    state.canvasState.height,
    state.userRequest,
    topRules,
    state.brandContext!,
    modeConfig.optionsCount
  );

  let designOptions: DesignOption[] = [];
  try {
    console.log('[Creative Agent] Planning design options');
    const response = await getModel().invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.userRequest),
    ]);
    
    if (typeof response === 'object' && response !== null && 'options' in response) {
      designOptions = (response as any).options || [];
    }
    
    console.log(`[Creative Agent] Planned ${designOptions.length} design options`);
  } catch (error) {
    console.error("Failed to plan design options:", error);
    designOptions = [];
  }

  return {
    phase: CreativeAgentPhase.GENERATE,
    designOptions,
  };
}
async function generateNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const creativeConfig = getCreativeConfig();
  
  for (const option of state.designOptions) {
    for (const element of option.elements) {
      if (element.type === "image" && (element.metadata as any)?.needsGeneration) {
        console.log(`[Creative Agent] Would generate image for: ${element.id}`);
      }
    }
  }

  return {
    phase: CreativeAgentPhase.REVIEW,
  };
}

async function reviewNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const creativeConfig = getCreativeConfig();
  const hitlTriggers = creativeConfig.hitl_triggers;
  const hitlReasons: string[] = [];

  if (state.designOptions.length > 1 && hitlTriggers.multiple_options) {
    hitlReasons.push(`Multiple options available (${state.designOptions.length})`);
  }

  const hasLowConfidence = state.designOptions.some(
    opt => opt.confidence < hitlTriggers.low_confidence
  );
  if (hasLowConfidence) {
    hitlReasons.push("Low confidence in some options");
  }

  const totalModifications = state.designOptions[0]?.modifications?.length || 0;
  if (totalModifications > hitlTriggers.major_changes_threshold) {
    hitlReasons.push(`Major changes (${totalModifications} modifications)`);
  }

  const hasCriticalElements = state.designOptions[0]?.elements?.some(
    el => el.metadata?.isCritical || el.metadata?.isProduct
  );
  if (hasCriticalElements) {
    hitlReasons.push("Changes to critical elements");
  }

  const brandConsistencyLow = state.designOptions.some(
    opt => (opt.brandConsistencyScore || 1) < (state.platformRules?.brand?.brandConsistencyScoreMin || 0.7)
  );
  if (brandConsistencyLow) {
    hitlReasons.push("Brand consistency below threshold");
  }

  const requiresHITL = hitlReasons.length > 0;

  console.log(`[Creative Agent] HITL required: ${requiresHITL}, Reasons: ${hitlReasons.join(", ")}`);

  return {
    phase: requiresHITL ? CreativeAgentPhase.REVIEW : CreativeAgentPhase.APPLY,
    requiresHITL,
    hitlReason: hitlReasons,
  };
}

async function applyNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const option = state.selectedOption || state.designOptions[0];
  
  if (!option) {
    throw new Error("No design option available to apply");
  }

  const preserveExisting = getCreativeConfig().contextual_awareness.preserve_existing_elements;
  
  let updatedElements = preserveExisting 
    ? [...state.canvasState.elements] 
    : [];

  for (const newElement of option.elements) {
    const existingIndex = updatedElements.findIndex(el => el.id === newElement.id);
    if (existingIndex >= 0) {
      updatedElements[existingIndex] = { ...updatedElements[existingIndex], ...newElement };
    } else {
      updatedElements.push(newElement);
    }
  }

  const updatedCanvas: CanvasState = {
    ...state.canvasState,
    elements: updatedElements,
    metadata: {
      ...state.canvasState.metadata,
      lastModified: new Date().toISOString(),
      version: (state.canvasState.metadata?.version || 0) + 1,
    },
  };

  return {
    canvasState: updatedCanvas,
    phase: CreativeAgentPhase.APPLY,
  };
}

function routeAfterReview(state: any): string {
  console.log(`[Creative Agent] Routing after review, requiresHITL: ${state.requiresHITL}`);
  return state.requiresHITL ? "review" : "apply";
}

export const creativeGraph = new StateGraph(CreativeStateSchema)
  .addNode("analyze", analyzeNode)
  .addNode("plan", planNode)
  .addNode("generate", generateNode)
  .addNode("review", reviewNode)
  .addNode("apply", applyNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", "plan")
  .addEdge("plan", "generate")
  .addEdge("generate", "review")
  .addConditionalEdges("review", routeAfterReview, ["review", "apply"])
  .addEdge("apply", END)
  .compile();

export async function runCreativeAgent(
  canvasState: CanvasState,
  platform: Platform,
  userRequest: string,
  generationMode: GenerationMode = "standard"
): Promise<CreativeState> {
  const result = await creativeGraph.invoke({
    canvasState,
    platform,
    userRequest,
    phase: CreativeAgentPhase.ANALYZE,
    generationMode,
    designOptions: [],
    requiresHITL: false,
    iterationCount: 0,
    messages: [],
  });

  return result as CreativeState;
}

