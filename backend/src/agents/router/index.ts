import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { RouterState, RouterOutput, RouterOutputSchema } from "../types.js";
import { z } from "zod";
import { ROUTER_PROMPT, ROUTER_INTENT_ANALYSIS_PROMPT } from "../../prompts/router.prompts.js";
import { createLazyModel } from "../model-factory.js";
import { getRouterConfig } from "../../config/config-loader.js";

const getModel = createLazyModel(
  { model: "gemini-2.5-flash", temperature: 0 },
  RouterOutputSchema
);

const RouterStateSchema = new StateSchema({
  canvasState: z.object({
    width: z.number(),
    height: z.number(),
    elements: z.array(z.any()),
    background: z.any().optional(),
    metadata: z.any().optional(),
  }),
  userRequest: z.string(),
  routerOutput: RouterOutputSchema.optional(),
  analysisMetadata: z.object({
    detectedKeywords: z.array(z.string()),
    platformConfidence: z.number(),
    intentConfidence: z.number(),
  }).optional(),
  messages: MessagesValue,
});

function analyzeIntent(userRequest: string, routerConfig: any): {
  category: string;
  subIntent?: string;
  detectedKeywords: string[];
  platformHints: string[];
} {
  const requestLower = userRequest.toLowerCase();
  const detectedKeywords: string[] = [];
  const platformHints: string[] = [];
  
  let maxScore = 0;
  let primaryCategory = "creative";
  let subIntent: string | undefined;

  for (const [category, config] of Object.entries(routerConfig.intent_categories) as any) {
    const keywords = config.keywords || [];
    let score = 0;
    
    for (const keyword of keywords) {
      if (requestLower.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        score += 1;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      primaryCategory = category;
    }

    if (score > 0 && config.sub_intents) {
      for (const intent of config.sub_intents) {
        const intentWords = intent.split('_');
        if (intentWords.some((word: string) => requestLower.includes(word))) {
          subIntent = intent;
        }
      }
    }
  }

  for (const [platform, keywords] of Object.entries(routerConfig.platform_detection.keywords) as any) {
    for (const keyword of keywords) {
      if (requestLower.includes(keyword.toLowerCase())) {
        platformHints.push(platform);
      }
    }
  }

  return {
    category: primaryCategory,
    subIntent,
    detectedKeywords,
    platformHints,
  };
}

async function analyzeNode(state: RouterState): Promise<Partial<RouterState>> {
  const routerConfig = getRouterConfig();
  const elementCount = state.canvasState.elements.length;
  const dimensions = `${state.canvasState.width}x${state.canvasState.height}`;

  const intentAnalysis = analyzeIntent(state.userRequest, routerConfig);
  
  const platformConfidence = intentAnalysis.platformHints.length > 0 ? 0.9 : 0.5;
  const intentConfidence = intentAnalysis.detectedKeywords.length > 0 ? 
    Math.min(0.95, 0.5 + (intentAnalysis.detectedKeywords.length * 0.15)) : 0.4;

  return {
    analysisMetadata: {
      detectedKeywords: intentAnalysis.detectedKeywords,
      platformConfidence,
      intentConfidence,
    },
  };
}

async function routerNode(state: RouterState): Promise<Partial<RouterState>> {
  const routerConfig = getRouterConfig();
  const elementCount = state.canvasState.elements.length;
  const dimensions = `${state.canvasState.width}x${state.canvasState.height}`;

  const metadata = state.analysisMetadata!;
  const intentHint = analyzeIntent(state.userRequest, routerConfig);

  const prompt = ROUTER_PROMPT(
    dimensions,
    elementCount,
    state.userRequest,
    metadata.detectedKeywords,
    intentHint.platformHints,
    intentHint.category,
    intentHint.subIntent
  );

  try {
    const routerOutput = await getModel().invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.userRequest),
    ]) as RouterOutput;

    const needsClarification = 
      routerOutput.confidence < routerConfig.require_clarification_threshold &&
      metadata.intentConfidence < 0.6;

    if (needsClarification) {
      routerOutput.needsClarification = true;
      routerOutput.clarificationQuestion = generateClarificationQuestion(
        routerOutput.category,
        routerOutput.platform,
        metadata
      );
    }

    return {
      routerOutput,
      messages: [],
    };
  } catch (error) {
    console.error("Router agent error:", error);
    
    const fallbackPlatform = intentHint.platformHints[0] || routerConfig.platform_detection.default;
    
    return {
      routerOutput: {
        category: intentHint.category as any,
        subIntent: intentHint.subIntent,
        platform: fallbackPlatform,
        params: {},
        confidence: 0.5,
        needsClarification: true,
        clarificationQuestion: "I'm not entirely sure what you'd like to do. Could you provide more details?",
      },
      messages: [],
    };
  }
}

function generateClarificationQuestion(
  category: string,
  platform: string,
  metadata: any
): string {
  if (metadata.platformConfidence < 0.6) {
    return `I detected you want to ${category}, but I'm not sure which platform. Are you designing for Amazon, Walmart, or Flipkart?`;
  }
  
  if (category === "creative") {
    return "Would you like me to generate new images, create text elements, or modify the layout?";
  }
  
  if (category === "validate") {
    return `Should I validate compliance with ${platform} guidelines, or check for specific issues?`;
  }
  
  return "Could you provide more details about what you'd like me to do?";
}

export const routerGraph = new StateGraph(RouterStateSchema)
  .addNode("analyze", analyzeNode)
  .addNode("router", routerNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", "router")
  .addEdge("router", END)
  .compile();

export async function routeRequest(
  canvasState: RouterState["canvasState"],
  userRequest: string
): Promise<RouterOutput> {
  const result = await routerGraph.invoke({
    canvasState,
    userRequest,
    messages: [],
  });

  if (!result.routerOutput) {
    throw new Error("Router failed to produce output");
  }

  return result.routerOutput as RouterOutput;
}

