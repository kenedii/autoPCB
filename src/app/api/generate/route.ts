import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openai";
import { GENERATE_PROMPT, EDIT_PROMPT } from "@/lib/prompts";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { prompt, model = "gpt-4o", existingCode } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    // Build messages based on whether this is a new generation or edit
    const messages: ChatMessage[] = [];

    if (existingCode) {
      // PCB-to-PCB editing workflow
      const systemPrompt = EDIT_PROMPT.replace("{existingCode}", existingCode);
      messages.push({ role: "system", content: systemPrompt });
    } else {
      // New generation
      messages.push({ role: "system", content: GENERATE_PROMPT });
    }

    messages.push({ role: "user", content: prompt });

    const skidlCode = await chatCompletion(messages, model);

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
