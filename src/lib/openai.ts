import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeOptions(options?: ChatCompletionOptions) {
  const temperature = clampNumber(options?.temperature ?? 0.3, 0, 2);
  const top_p = clampNumber(options?.topP ?? 1, 0, 1);
  const frequency_penalty = clampNumber(options?.frequencyPenalty ?? 0, -2, 2);
  const presence_penalty = clampNumber(options?.presencePenalty ?? 0, -2, 2);
  const max_tokens = Math.floor(clampNumber(options?.maxTokens ?? 12288, 256, 32768));

  return {
    temperature,
    top_p,
    frequency_penalty,
    presence_penalty,
    max_tokens,
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = "gpt-4o",
  customApiKey?: string,
  options?: ChatCompletionOptions
): Promise<string> {
  let apiKey = customApiKey;
  let baseURL: string | undefined = undefined;
  const normalizedModel = model.toLowerCase();

  if (normalizedModel.startsWith("deepseek")) {
    apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    baseURL = "https://api.deepseek.com";
  } else if (
    normalizedModel.startsWith("claude") ||
    normalizedModel.startsWith("gemini") ||
    normalizedModel.startsWith("qwen") ||
    normalizedModel.startsWith("anthropic/") ||
    normalizedModel.startsWith("google/") ||
    normalizedModel.startsWith("qwen/")
  ) {
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  } else {
    apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    throw new Error(`API key is missing for model ${model}`);
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const params = sanitizeOptions(options);

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: params.temperature,
    top_p: params.top_p,
    frequency_penalty: params.frequency_penalty,
    presence_penalty: params.presence_penalty,
    max_tokens: params.max_tokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }
  return content;
}
