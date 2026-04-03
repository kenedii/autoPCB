import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openai";
import { FIX_PROMPT } from "@/lib/prompts";
import { exec } from "child_process";
import { writeFile, readFile, mkdir, rm, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { verifySession } from "@/lib/auth";
import JSZip from "jszip";

/**
 * Pre-execution sanitizer: fixes common AI-generated SKiDL mistakes before running.
 *
 * 1. Rewrites inline Net('X') += ... to use a named variable, which prevents:
 *    SyntaxError: 'function call' is an illegal expression for augmented assignment
 *
 * 2. Ensures set_default_tool(KICAD6) is present.
 *
 * 3. Appends netlist/spice/pcb/schematic generators if generate_netlist() is present.
 */
function sanitizeSkidlCode(code: string): string {
  let result = code;

  // Fix: Net('X') += something  →  _net_X = Net('X')\n_net_X += something
  // Handles both single and double quotes, and variations with spaces
  result = result.replace(
    /^([ \t]*)Net\((['"])(.*?)\2\)\s*\+=/gm,
    (match, indent, quote, netName) => {
      const varName = `_net_${netName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      return `${indent}${varName} = Net(${quote}${netName}${quote})\n${indent}${varName} +=`;
    }
  );

  // Inject KICAD6 default if missing
  if (!result.includes("set_default_tool(KICAD6)")) {
    result = result.replace(
      "from skidl import *",
      "from skidl import *\nset_default_tool(KICAD6)"
    );
  }

  // Append output generators after generate_netlist()
  if (result.includes("generate_netlist()") && !result.includes("generate_netlist(file_=")) {
    result = result.replace(
      /generate_netlist\(\)/g,
      `generate_netlist()\ntry:\n    generate_netlist(file_='circuit.spice', tool=SPICE)\nexcept Exception:\n    pass\ntry:\n    generate_pcb(file_='circuit.kicad_pcb')\nexcept Exception:\n    pass\ntry:\n    generate_schematic(file_='circuit.kicad_sch')\nexcept Exception:\n    pass`
    );
  }

  return result;
}

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
  gerberZipBase64?: string;
  drillZipBase64?: string;
  stepBase64?: string;
  cir?: string;
  lib?: string;
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
): Promise<{ kicadPcb?: string; kicadSch?: string; netlist?: string; spice?: string; schematicSvg?: string; gerberZipBase64?: string; drillZipBase64?: string; stepBase64?: string; cir?: string; lib?: string }> {
  const result: any = {};

  // Try to read various output files SKiDL might generate
  const extensions = [
    { ext: ".kicad_pcb", key: "kicadPcb" },
    { ext: ".kicad_sch", key: "kicadSch" },
    { ext: ".net", key: "netlist" },
    { ext: ".spice", key: "spice" },
    { ext: ".cir", key: "cir" },
    { ext: ".lib", key: "lib" },
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

  // Generate extras if PCB exists
  const pcbPath = join(workDir, "circuit.kicad_pcb");
  if (existsSync(pcbPath)) {
    try {
      const gbrDir = join(workDir, "gerbers");
      await mkdir(gbrDir, { recursive: true });
      await new Promise<void>((resolve) => {
        exec(`kicad-cli pcb export gerbers -o "${gbrDir}/" "${pcbPath}"`, { cwd: workDir, timeout: 30000 }, () => resolve());
      });
      const gbrFiles = await readdir(gbrDir).catch(() => []);
      if (gbrFiles.length > 0) {
        const zip = new JSZip();
        for (const f of gbrFiles) {
          zip.file(f, await readFile(join(gbrDir, f)));
        }
        const b = await zip.generateAsync({ type: "nodebuffer" });
        result.gerberZipBase64 = b.toString("base64");
      }
    } catch (e) {
      console.error("[kicad-cli] gerbers error", e);
    }

    try {
      const drlDir = join(workDir, "drills");
      await mkdir(drlDir, { recursive: true });
      await new Promise<void>((resolve) => {
        exec(`kicad-cli pcb export drill -o "${drlDir}/" "${pcbPath}"`, { cwd: workDir, timeout: 30000 }, () => resolve());
      });
      const drlFiles = await readdir(drlDir).catch(() => []);
      if (drlFiles.length > 0) {
        const zip = new JSZip();
        for (const f of drlFiles) {
          zip.file(f, await readFile(join(drlDir, f)));
        }
        const b = await zip.generateAsync({ type: "nodebuffer" });
        result.drillZipBase64 = b.toString("base64");
      }
    } catch (e) {
      console.error("[kicad-cli] drill error", e);
    }

    try {
      const stepPath = join(workDir, "circuit.step");
      await new Promise<void>((resolve) => {
        exec(`kicad-cli pcb export step -o "${stepPath}" "${pcbPath}"`, { cwd: workDir, timeout: 60000 }, () => resolve());
      });
      if (existsSync(stepPath)) {
        const buf = await readFile(stepPath);
        result.stepBase64 = buf.toString("base64");
      }
    } catch (e) {
      console.error("[kicad-cli] step error", e);
    }
  }

  // Populate .cir or .lib if generating spice was successful
  if (result.spice && !result.cir) result.cir = result.spice;
  if (result.spice && !result.lib) result.lib = result.spice;

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

    // Sanitize + augment the code (fix inline Net() assignment syntax, inject KICAD6, add generators)
    const codeToRun = sanitizeSkidlCode(skidlCode);

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
      result.gerberZipBase64 = files.gerberZipBase64;
      result.drillZipBase64 = files.drillZipBase64;
      result.stepBase64 = files.stepBase64;
      result.cir = files.cir;
      result.lib = files.lib;
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

          // Second execution attempt with fixed + sanitized code
          // Clean the work directory for retry
          await rm(workDir, { recursive: true, force: true });
          await mkdir(workDir, { recursive: true });

          const retryCodeToRun = sanitizeSkidlCode(cleanFixed);

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
            result.gerberZipBase64 = files.gerberZipBase64;
            result.drillZipBase64 = files.drillZipBase64;
            result.stepBase64 = files.stepBase64;
            result.cir = files.cir;
            result.lib = files.lib;
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