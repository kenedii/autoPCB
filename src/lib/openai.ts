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

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = "gpt-4o",
  customApiKey?: string
): Promise<string> {
  let apiKey = customApiKey;
  let baseURL: string | undefined = undefined;

  if (model.startsWith("deepseek")) {
    apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    baseURL = "https://api.deepseek.com";
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

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }
  return content;
}
