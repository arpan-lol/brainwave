import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

interface ModelConfig {
  model: string;
  temperature: number;
}

const modelCache = new Map<string, any>();

export function createLazyModel<T>(config: ModelConfig, schema: T) {
  const cacheKey = `${config.model}-${config.temperature}`;
  
  return () => {
    if (!modelCache.has(cacheKey)) {
      const model = new ChatGoogleGenerativeAI({
        model: config.model,
        temperature: config.temperature,
        apiKey: process.env.GOOGLE_API_KEY,
      });
      modelCache.set(cacheKey, model.withStructuredOutput(schema));
    }
    return modelCache.get(cacheKey);
  };
}
