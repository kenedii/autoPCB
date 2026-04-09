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
    normalizedModel.includes("/claude") ||
    normalizedModel.includes("/gemini") ||
    normalizedModel.includes("/qwen")
  ) {
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  } else {
    apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    const provider = normalizedModel.includes("claude") || normalizedModel.includes("anthropic")
      ? "OpenRouter (Claude)"
      : normalizedModel.includes("gemini") || normalizedModel.includes("google")
        ? "OpenRouter (Gemini)"
        : normalizedModel.includes("qwen")
          ? "OpenRouter (Qwen)"
          : normalizedModel.startsWith("deepseek")
            ? "DeepSeek"
            : "OpenAI";
    
    const envVar =
      provider === "OpenRouter (Claude)" || provider === "OpenRouter (Gemini)" || provider === "OpenRouter (Qwen)"
        ? "OPENROUTER_API_KEY"
        : normalizedModel.startsWith("deepseek")
          ? "DEEPSEEK_API_KEY"
          : "OPENAI_API_KEY";
    
    throw new Error(
      `API key is missing for {provider: "${provider}", model: "${model}"}. ` +
      `Please set the ${envVar} environment variable or provide a custom API key in the UI.`
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const params = sanitizeOptions(options);

  try {
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
      throw new Error("No response content from model");
    }
    return content;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("authentication")) {
      throw new Error(`Authentication failed: Invalid API key for model "${model}". Please verify your API credentials.`);
    } else if (errorMsg.includes("429") || errorMsg.includes("Too Many Requests")) {
      throw new Error(`Rate limit exceeded for model "${model}". Please wait before retrying.`);
    } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ENOTFOUND") || errorMsg.includes("ERR_")) {
      throw new Error(
        `Connection failed to ${baseURL || "OpenAI API"} for model "${model}". ` +
        `Please check your network connection and API endpoint configuration.`
      );
    }
    throw error;
  }
}
