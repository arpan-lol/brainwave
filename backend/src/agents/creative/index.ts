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
} from "../types.js";
import { getPlatformRules } from "./platform-rules.js";
import { CREATIVE_PLAN_PROMPT } from "../../prompts/creative.prompts.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
});

const modelWithStructuredOutput = model.withStructuredOutput(DesignOptionsSchema);

const generateImageTool = tool(
  async ({ prompt, width, height }) => {
    // TODO
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

// Tool: Remove background (placeholder - integrate with remove.bg)
const removeBackgroundTool = tool(
  async ({ imageUrl }) => {
    // TODO: Integrate with remove.bg API
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

// Tool: Get platform rules
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

// Tool: Suggest color palette
const suggestColorPaletteTool = tool(
  async ({ brand, platform }) => {
    // Simple rule-based color palette suggestion
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

// ===== State Schema =====
const CreativeStateSchema = new StateSchema({
  canvasState: z.object({
    width: z.number(),
    height: z.number(),
    elements: z.array(z.any()),
    background: z.any().optional(),
  }),
  platform: z.enum(["amazon", "walmart", "flipkart"]),
  userRequest: z.string(),
  phase: z.nativeEnum(CreativeAgentPhase),
  designOptions: z.array(z.any()),
  selectedOption: z.any().optional(),
  platformRules: z.any().optional(),
  requiresHITL: z.boolean(),
  messages: MessagesValue,
});

// ===== Graph Nodes =====

// Parse node - understand the request
async function parseNode(state: CreativeState): Promise<Partial<CreativeState>> {
  return {
    phase: CreativeAgentPhase.PLAN,
    platformRules: getPlatformRules(state.platform),
  };
}

// Plan node - plan the design approach
async function planNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const elementCount = state.canvasState.elements.length;
  const rules = state.platformRules!;
  const topRules = [
    `Background color: ${rules.requiredBgColor || "any"}`,
    `Dimensions: ${rules.dimensions.width}x${rules.dimensions.height}`,
    `Max file size: ${rules.fileSize.maxMB}MB`,
    `Product coverage: ${rules.product.minCoverage || 60}-${rules.product.maxCoverage || 80}%`,
  ];

  const prompt = CREATIVE_PLAN_PROMPT(
    state.platform,
    elementCount,
    state.canvasState.width,
    state.canvasState.height,
    state.userRequest,
    topRules
  );

  let designOptions: DesignOption[] = [];
  try {
    const response = await modelWithStructuredOutput.invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.userRequest),
    ]) as { options: DesignOption[] };
    
    designOptions = response.options || [];
  } catch (error) {
    console.error("Failed to generate design options:", error);
    designOptions = [];
  }

  // Determine if HITL is required
  const requiresHITL = 
    designOptions.length > 1 || 
    designOptions.some(opt => opt.confidence < 0.7) ||
    elementCount > 3;

  return {
    phase: CreativeAgentPhase.GENERATE,
    designOptions,
    requiresHITL,
  };
}

// Generate node - generate design assets
async function generateNode(state: CreativeState): Promise<Partial<CreativeState>> {
  // For MVP, skip actual generation and move to HITL or APPLY
  const nextPhase = state.requiresHITL 
    ? CreativeAgentPhase.HITL 
    : CreativeAgentPhase.APPLY;

  return {
    phase: nextPhase,
  };
}

// HITL node - human-in-the-loop decision point
async function hitlNode(state: CreativeState): Promise<Partial<CreativeState>> {
  // This will be handled by the API endpoint
  // For now, auto-select the first option
  const selectedOption = state.designOptions[0];

  return {
    phase: CreativeAgentPhase.APPLY,
    selectedOption,
  };
}

// Apply node - apply the design to canvas
async function applyNode(state: CreativeState): Promise<Partial<CreativeState>> {
  const option = state.selectedOption || state.designOptions[0];
  
  if (!option) {
    throw new Error("No design option available to apply");
  }

  // Merge the new elements with existing canvas
  const updatedCanvas: CanvasState = {
    ...state.canvasState,
    elements: [...state.canvasState.elements, ...option.elements],
  };

  return {
    canvasState: updatedCanvas,
    phase: CreativeAgentPhase.APPLY, // Final state
  };
}

// ===== Conditional Edge Functions =====

function shouldContinue(state: any): string {
  switch (state.phase) {
    case CreativeAgentPhase.PARSE:
      return "plan";
    case CreativeAgentPhase.PLAN:
      return "generate";
    case CreativeAgentPhase.GENERATE:
      return state.requiresHITL ? "hitl" : "apply";
    case CreativeAgentPhase.HITL:
      return "apply";
    case CreativeAgentPhase.APPLY:
      return END;
    default:
      return END;
  }
}

// ===== Build the Creative Agent Graph =====
export const creativeGraph = new StateGraph(CreativeStateSchema)
  .addNode("parse", parseNode)
  .addNode("plan", planNode)
  .addNode("generate", generateNode)
  .addNode("hitl", hitlNode)
  .addNode("apply", applyNode)
  .addEdge(START, "parse")
  .addConditionalEdges("parse", shouldContinue, ["plan", END])
  .addConditionalEdges("plan", shouldContinue, ["generate", END])
  .addConditionalEdges("generate", shouldContinue, ["hitl", "apply", END])
  .addConditionalEdges("hitl", shouldContinue, ["apply", END])
  .addConditionalEdges("apply", shouldContinue, [END])
  .compile();

// ===== Helper Function =====
export async function runCreativeAgent(
  canvasState: CanvasState,
  platform: Platform,
  userRequest: string
): Promise<CreativeState> {
  const result = await creativeGraph.invoke({
    canvasState,
    platform,
    userRequest,
    phase: CreativeAgentPhase.PARSE,
    designOptions: [],
    requiresHITL: false,
    messages: [],
  });

  return result as CreativeState;
}
