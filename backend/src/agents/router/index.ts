import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { RouterState, RouterOutput, RouterOutputSchema } from "../types.js";
import { z } from "zod";
import { ROUTER_PROMPT } from "../../prompts/router.prompts.js";
import { createLazyModel } from "../model-factory.js";

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
  }),
  userRequest: z.string(),
  routerOutput: RouterOutputSchema.optional(),
  messages: MessagesValue,
});

async function routerNode(state: RouterState): Promise<Partial<RouterState>> {
  const elementCount = state.canvasState.elements.length;
  const dimensions = `${state.canvasState.width}x${state.canvasState.height}`;

  const prompt = ROUTER_PROMPT(dimensions, elementCount, state.userRequest);

  try {
    const routerOutput = await getModel().invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.userRequest),
    ]) as RouterOutput;

    return {
      routerOutput,
      messages: [],
    };
  } catch (error) {
    console.error("Router agent error:", error);
    return {
      routerOutput: {
        category: "creative",
        platform: "amazon",
        params: {},
        confidence: 0.5,
      },
      messages: [],
    };
  }
}

// Build the router graph
export const routerGraph = new StateGraph(RouterStateSchema)
  .addNode("router", routerNode)
  .addEdge(START, "router")
  .addEdge("router", END)
  .compile();

// Helper function to invoke the router
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
