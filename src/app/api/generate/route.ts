import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatCompletionOptions, ChatMessage } from "@/lib/openai";
import { GENERATE_PROMPT, EDIT_PROMPT, DESIGNER_PROMPT } from "@/lib/prompts";
import { verifySession } from "@/lib/auth";

interface GenerationParams {
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
  planningMaxTokens?: number;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseGenerationParams(raw: unknown): GenerationParams {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const params: GenerationParams = {};

  const temperature = toFiniteNumber(source.temperature);
  const topP = toFiniteNumber(source.topP);
  const frequencyPenalty = toFiniteNumber(source.frequencyPenalty);
  const presencePenalty = toFiniteNumber(source.presencePenalty);
  const maxTokens = toFiniteNumber(source.maxTokens);
  const planningMaxTokens = toFiniteNumber(source.planningMaxTokens);

  if (typeof temperature === "number") params.temperature = clamp(temperature, 0, 2);
  if (typeof topP === "number") params.topP = clamp(topP, 0, 1);
  if (typeof frequencyPenalty === "number") params.frequencyPenalty = clamp(frequencyPenalty, -2, 2);
  if (typeof presencePenalty === "number") params.presencePenalty = clamp(presencePenalty, -2, 2);
  if (typeof maxTokens === "number") params.maxTokens = Math.floor(clamp(maxTokens, 256, 32768));
  if (typeof planningMaxTokens === "number") params.planningMaxTokens = Math.floor(clamp(planningMaxTokens, 256, 16384));

  return params;
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { prompt, model = "gpt-4o", existingCode, apiKey, generationParams } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt is required" },
        { status: 400 }
      );
    }

    // We will let chatCompletion handle API key validation so the user can use their own
    const parsedParams = parseGenerationParams(generationParams);
    const plannerOptions: ChatCompletionOptions = {
      temperature: parsedParams.temperature,
      topP: parsedParams.topP,
      frequencyPenalty: parsedParams.frequencyPenalty,
      presencePenalty: parsedParams.presencePenalty,
      maxTokens: parsedParams.planningMaxTokens ?? Math.min(parsedParams.maxTokens ?? 12288, 8192),
    };
    const coderOptions: ChatCompletionOptions = {
      temperature: parsedParams.temperature,
      topP: parsedParams.topP,
      frequencyPenalty: parsedParams.frequencyPenalty,
      presencePenalty: parsedParams.presencePenalty,
      maxTokens: parsedParams.maxTokens,
    };


    // ----------------------------------------------------------------------
    // STEP 1: Designer Agent (Architectural Planning)
    // ----------------------------------------------------------------------
    const designerMessages: ChatMessage[] = [];
    if (existingCode) {
      designerMessages.push({ 
        role: "system", 
        content: `You are an expert PCB designer. Analyze the following existing SKiDL code and the user's requested changes, and propose a detailed architectural plan for the updated circuit. Do NOT write code yet. Focus on components, footprints, and net connections.\n\nExisting code:\n\`\`\`python\n${existingCode}\n\`\`\`` 
      });
    } else {
      designerMessages.push({ role: "system", content: DESIGNER_PROMPT });
    }
    designerMessages.push({ role: "user", content: prompt });
    
    console.log("[/api/generate] Asking Designer Agent for architecture...");
    const architecturalPlan = await chatCompletion(designerMessages, model, apiKey, plannerOptions);
    console.log("[/api/generate] Architecture plan received.");

    // ----------------------------------------------------------------------
    // STEP 2: Coder Agent (SKiDL Generation)
    // ----------------------------------------------------------------------
    const coderMessages: ChatMessage[] = [];

    if (existingCode) {
      // PCB-to-PCB editing workflow
      const systemPrompt = EDIT_PROMPT.replace("{existingCode}", existingCode);
      coderMessages.push({ role: "system", content: systemPrompt });
    } else {
      // New generation
      coderMessages.push({ role: "system", content: GENERATE_PROMPT });
    }

    coderMessages.push({ 
      role: "user", 
      content: `Here is the architectural plan to implement based on my request:\n\n${architecturalPlan}\n\nMy original request was: ${prompt}\n\nPlease generate the corresponding valid SKiDL Python code.` 
    });

    console.log("[/api/generate] Asking Coder Agent for SKiDL code...");
    const skidlCode = await chatCompletion(coderMessages, model, apiKey, coderOptions);

    // Clean up any markdown formatting the AI might add despite instructions
    const cleanCode = skidlCode
      .replace(/^```python\n?/gm, "")
      .replace(/^```\n?/gm, "")
      .trim();

    return NextResponse.json({ skidlCode: cleanCode });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[/api/generate] Error:", message);
    console.error("[/api/generate] Full error:", error);
    console.error("[/api/generate] Model:", model);
    console.error("[/api/generate] Has custom API key:", !!apiKey);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
