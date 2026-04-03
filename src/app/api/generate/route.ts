import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openai";
import { GENERATE_PROMPT, EDIT_PROMPT, DESIGNER_PROMPT } from "@/lib/prompts";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { prompt, model = "gpt-4o", existingCode, apiKey } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt is required" },
        { status: 400 }
      );
    }

    // We will let chatCompletion handle API key validation so the user can use their own


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
    const architecturalPlan = await chatCompletion(designerMessages, model, apiKey);
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
    const skidlCode = await chatCompletion(coderMessages, model, apiKey);

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
