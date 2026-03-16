import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openai";
import { FIX_PROMPT } from "@/lib/prompts";
import { exec } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { verifySession } from "@/lib/auth";

interface CompileResult {
  success: boolean;
  kicadPcb?: string;
  kicadSch?: string;
  netlist?: string;
  error?: string;
  fixedCode?: string;
  retryUsed?: boolean;
}

async function executeSkidl(
  code: string,
  workDir: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const pyFile = join(workDir, "circuit.py");
  await writeFile(pyFile, code, "utf-8");

  return new Promise((resolve) => {
    exec(
      `python "${pyFile}"`,
      { cwd: workDir, timeout: 60000 },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      }
    );
  });
}

async function collectOutputFiles(
  workDir: string
): Promise<{ kicadPcb?: string; kicadSch?: string; netlist?: string }> {
  const result: { kicadPcb?: string; kicadSch?: string; netlist?: string } = {};

  // Try to read various output files SKiDL might generate
  const extensions = [
    { ext: ".kicad_pcb", key: "kicadPcb" as const },
    { ext: ".kicad_sch", key: "kicadSch" as const },
    { ext: ".net", key: "netlist" as const },
  ];

  for (const { ext, key } of extensions) {
    try {
      // SKiDL usually names output files based on the script name
      const possibleNames = [
        join(workDir, `circuit${ext}`),
        join(workDir, `circuit_pcb${ext}`),
      ];

      for (const filePath of possibleNames) {
        try {
          const content = await readFile(filePath, "utf-8");
          result[key] = content;
          break;
        } catch {
          // File doesn't exist, try next
        }
      }
    } catch {
      // Skip
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  const workDir = join(tmpdir(), `autopcb-${randomUUID()}`);

  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { skidlCode, model = "gpt-4o" } = body;

    if (!skidlCode || typeof skidlCode !== "string") {
      return NextResponse.json(
        { error: "SKiDL code is required" },
        { status: 400 }
      );
    }

    // Create temp working directory
    await mkdir(workDir, { recursive: true });

    // First execution attempt
    let execResult = await executeSkidl(skidlCode, workDir);
    const result: CompileResult = { success: execResult.success };

    if (execResult.success) {
      // Collect output files
      const files = await collectOutputFiles(workDir);
      result.kicadPcb = files.kicadPcb;
      result.kicadSch = files.kicadSch;
      result.netlist = files.netlist;
    } else {
      // RETRY-ON-ERROR: Give the AI one chance to fix the code
      const errorOutput = `${execResult.stdout}\n${execResult.stderr}`.trim();
      result.error = errorOutput;

      if (process.env.OPENAI_API_KEY) {
        try {
          const fixPrompt = FIX_PROMPT
            .replace("{code}", skidlCode)
            .replace("{error}", errorOutput);

          const messages: ChatMessage[] = [
            { role: "system", content: fixPrompt },
            {
              role: "user",
              content: "Fix this SKiDL code based on the error above.",
            },
          ];

          const fixedCode = await chatCompletion(messages, model);
          const cleanFixed = fixedCode
            .replace(/^```python\n?/gm, "")
            .replace(/^```\n?/gm, "")
            .trim();

          // Second execution attempt with fixed code
          // Clean the work directory for retry
          await rm(workDir, { recursive: true, force: true });
          await mkdir(workDir, { recursive: true });

          execResult = await executeSkidl(cleanFixed, workDir);
          result.retryUsed = true;
          result.fixedCode = cleanFixed;

          if (execResult.success) {
            result.success = true;
            result.error = undefined;
            const files = await collectOutputFiles(workDir);
            result.kicadPcb = files.kicadPcb;
            result.kicadSch = files.kicadSch;
            result.netlist = files.netlist;
          } else {
            result.error = `Original error:\n${errorOutput}\n\nRetry error:\n${execResult.stdout}\n${execResult.stderr}`.trim();
          }
        } catch (fixError) {
          result.error = `${errorOutput}\n\nAuto-fix attempt failed: ${
            fixError instanceof Error ? fixError.message : "Unknown error"
          }`;
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[/api/compile] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Clean up temp directory
    try {
      await rm(workDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
