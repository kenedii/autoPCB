import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openai";
import { FIX_PROMPT } from "@/lib/prompts";
import { exec } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { verifySession } from "@/lib/auth";

interface CompileResult {
  success: boolean;
  kicadPcb?: string;
  kicadSch?: string;
  netlist?: string;
  spice?: string;
  schematicSvg?: string;
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

  const isWin = process.platform === "win32";
  const localVenv = isWin
    ? join(process.cwd(), ".venv", "Scripts", "python.exe")
    : join(process.cwd(), ".venv", "bin", "python");
  const optVenv = "/opt/venv/bin/python";
  
  let pythonCmd = isWin ? "python" : "python3";
  if (existsSync(localVenv)) {
    pythonCmd = `"${localVenv}"`;
  } else if (existsSync(optVenv)) {
    pythonCmd = `"${optVenv}"`;
  }

  const env = { ...process.env };
  if (isWin) {
    const versions = ["9.0", "8.0", "7.0", "6.0"];
    for (const v of versions) {
      const p = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\symbols`;
      if (existsSync(p)) {
        env.KICAD_SYMBOL_DIR = p;
        env.KICAD9_SYMBOL_DIR = p;
        env.KICAD8_SYMBOL_DIR = p;
        env.KICAD7_SYMBOL_DIR = p;
        env.KICAD6_SYMBOL_DIR = p;
        
        const fp = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\footprints`;
        if (existsSync(fp)) {
          env.KICAD_FOOTPRINT_DIR = fp;
          env.KICAD9_FOOTPRINT_DIR = fp;
          env.KICAD8_FOOTPRINT_DIR = fp;
          env.KICAD7_FOOTPRINT_DIR = fp;
          env.KICAD6_FOOTPRINT_DIR = fp;
        }
        break;
      }
    }
  } else {
    if (existsSync("/usr/share/kicad/symbols")) {
      const p = "/usr/share/kicad/symbols";
      env.KICAD_SYMBOL_DIR = p;
      env.KICAD9_SYMBOL_DIR = p;
      env.KICAD8_SYMBOL_DIR = p;
      env.KICAD7_SYMBOL_DIR = p;
      env.KICAD6_SYMBOL_DIR = p;
    }
    if (existsSync("/usr/share/kicad/footprints")) {
      const fp = "/usr/share/kicad/footprints";
      env.KICAD_FOOTPRINT_DIR = fp;
      env.KICAD9_FOOTPRINT_DIR = fp;
      env.KICAD8_FOOTPRINT_DIR = fp;
      env.KICAD7_FOOTPRINT_DIR = fp;
      env.KICAD6_FOOTPRINT_DIR = fp;
    }
  }

  // Copy template tables to workdir to resolve SKiDL warnings
  try {
    if (isWin) {
      // Find template
      const versions = ["9.0", "8.0", "7.0", "6.0"];
      for (const v of versions) {
        const tpl = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\template\\fp-lib-table`;
        if (existsSync(tpl)) {
          await writeFile(join(workDir, "fp-lib-table"), await readFile(tpl, "utf-8"));
        }
        const symTpl = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\template\\sym-lib-table`;
        if (existsSync(symTpl)) {
          await writeFile(join(workDir, "sym-lib-table"), await readFile(symTpl, "utf-8"));
          break;
        }
      }
    } else {
      if (existsSync("/usr/share/kicad/template/fp-lib-table")) {
        await writeFile(join(workDir, "fp-lib-table"), await readFile("/usr/share/kicad/template/fp-lib-table", "utf-8"));
      }
      if (existsSync("/usr/share/kicad/template/sym-lib-table")) {
        await writeFile(join(workDir, "sym-lib-table"), await readFile("/usr/share/kicad/template/sym-lib-table", "utf-8"));
      }
    }
  } catch (e) {
    // Ignore if not accessible
  }

  return new Promise((resolve) => {
    exec(
      `${pythonCmd} "${pyFile}"`,
      { cwd: workDir, timeout: 60000, env },
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
): Promise<{ kicadPcb?: string; kicadSch?: string; netlist?: string; spice?: string; schematicSvg?: string }> {
  const result: { kicadPcb?: string; kicadSch?: string; netlist?: string; spice?: string; schematicSvg?: string } = {};

  // Try to read various output files SKiDL might generate
  const extensions = [
    { ext: ".kicad_pcb", key: "kicadPcb" as const },
    { ext: ".kicad_sch", key: "kicadSch" as const },
    { ext: ".net", key: "netlist" as const },
    { ext: ".spice", key: "spice" as const },
    { ext: ".cir", key: "spice" as const },
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
          
          if (ext === ".kicad_sch") {
            try {
              const svgPath = filePath.replace(".kicad_sch", ".svg");
              await new Promise<void>((resolve) => {
                // Generate SVG and resolve regardless of success/fail
                exec(`kicad-cli sch export svg "${filePath}" -o "${svgPath}" --theme "kicad 2020"`, { cwd: workDir, timeout: 30000 }, () => resolve());
              });
              result.schematicSvg = await readFile(svgPath, "utf-8");
            } catch (e) {
              console.error("[kicad-cli] Failed to generate SVG", e);
            }
          }
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
    const { skidlCode, model = "gpt-4o", apiKey } = body;

    if (!skidlCode || typeof skidlCode !== "string") {
      return NextResponse.json(
        { error: "SKiDL code is required" },
        { status: 400 }
      );
    }

    // Create temp working directory
    await mkdir(workDir, { recursive: true });

    let codeToRun = skidlCode;
    // ensure generator works with Debian KiCad 6
    if (!codeToRun.includes("set_default_tool(KICAD6)")) {
        codeToRun = codeToRun.replace(
            "from skidl import *",
            "from skidl import *\nset_default_tool(KICAD6)"
        );
    }

    // ensure generate_spice is appended if generate_netlist is present so we always get spice output for simulator
    if (codeToRun.includes("generate_netlist()") && !codeToRun.includes("generate_spice(")) {
        codeToRun = codeToRun.replace(
            "generate_netlist()",
            "generate_netlist()\ntry:\n    generate_spice(file_='circuit.spice')\nexcept Exception:\n    pass\n"
        );
    }

    // First execution attempt
    let execResult = await executeSkidl(codeToRun, workDir);
    const result: CompileResult = { success: execResult.success };

    if (execResult.success) {
      // Collect output files
      const files = await collectOutputFiles(workDir);
      result.kicadPcb = files.kicadPcb;
      result.kicadSch = files.kicadSch;
      result.netlist = files.netlist;
      result.spice = files.spice;
      result.schematicSvg = files.schematicSvg;
    } else {
      // RETRY-ON-ERROR: Give the AI one chance to fix the code
      const errorOutput = `${execResult.stdout}\n${execResult.stderr}`.trim();
      result.error = errorOutput;

      if (true) { // Always try to fix
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

          const fixedCode = await chatCompletion(messages, model, apiKey);
          const cleanFixed = fixedCode
            .replace(/^```python\n?/gm, "")
            .replace(/^```\n?/gm, "")
            .trim();

          // Second execution attempt with fixed code
          // Clean the work directory for retry
          await rm(workDir, { recursive: true, force: true });
          await mkdir(workDir, { recursive: true });

          let retryCodeToRun = cleanFixed;
          if (!retryCodeToRun.includes("set_default_tool(KICAD6)")) {
              retryCodeToRun = retryCodeToRun.replace(
                  "from skidl import *",
                  "from skidl import *\nset_default_tool(KICAD6)"
              );
          }
          if (retryCodeToRun.includes("generate_netlist()") && !retryCodeToRun.includes("generate_spice(")) {
              retryCodeToRun = retryCodeToRun.replace(
                  "generate_netlist()",
                  "generate_netlist()\ntry:\n    generate_spice(file_='circuit.spice')\nexcept Exception:\n    pass\n"
              );
          }

          execResult = await executeSkidl(retryCodeToRun, workDir);
          result.retryUsed = true;
          result.fixedCode = cleanFixed;

          if (execResult.success) {
            result.success = true;
            result.error = undefined;
            const files = await collectOutputFiles(workDir);
            result.kicadPcb = files.kicadPcb;
            result.kicadSch = files.kicadSch;
            result.netlist = files.netlist;
            result.spice = files.spice;
            result.schematicSvg = files.schematicSvg;
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