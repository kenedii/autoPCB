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

const MONKEY_PATCH = `
import skidl
from skidl.part import Part as OriginalPart
from skidl.pin import Pin

class AutoPart(OriginalPart):
  def __init__(self, *args, **kwargs):
    try:
      super().__init__(*args, **kwargs)
    except Exception:
      name = kwargs.get('name', 'Unknown')
      desired_ref = kwargs.get('ref')
      if len(args) > 1:
        name = args[1]
      elif len(args) == 1:
        name = args[0]

      kwargs_new = {'tool': kwargs.get('tool', skidl.SKIDL), 'name': name, 'pins': []}
      if 'footprint' in kwargs:
        kwargs_new['footprint'] = kwargs['footprint']
      if 'value' in kwargs:
        kwargs_new['value'] = kwargs['value']
      if 'dest' in kwargs:
        kwargs_new['dest'] = kwargs['dest']

      super().__init__(**kwargs_new)

      if desired_ref:
        try:
          if getattr(self, 'circuit', None) is not None:
            self.ref = desired_ref
          else:
            self._ref = str(desired_ref)
        except Exception:
          self._ref = str(desired_ref)

  def __getitem__(self, key):
    try:
      res = super().__getitem__(key)
      if res is None or (isinstance(res, (list, tuple)) and len(res) == 0):
        p = Pin(num=str(key), name=str(key))
        self += p
        return super().__getitem__(key)
      return res
    except Exception:
      p = Pin(num=str(key), name=str(key))
      self += p
      return super().__getitem__(key)

  def __getattr__(self, key):
    try:
      res = super().__getattr__(key)
      if res is None or (isinstance(res, (list, tuple)) and len(res) == 0):
        k = str(key)
        p = Pin(num=k, name=k)
        self += p
        return super().__getattr__(key)
      return res
    except Exception as e:
      k = str(key)
      if k.startswith('_') or k in ['ref_prefix', 'circuit', 'logger', 'name', 'ref', 'value', 'footprint', 'hierarchy', 'aliases', 'keywords', 'description', 'datasheet', 'search_text', 'do_erc', 'tag', 'tag_ref_name', 'hiername', 'hiertuple']:
        raise e
      p = Pin(num=k, name=k)
      self += p
      return super().__getattr__(key)

skidl.Part = AutoPart
Part = AutoPart

def _autoskidl_make_part(name, pin_count=8, ref='', footprint='', value=''):
  pin_count = max(2, int(pin_count or 2))
  kwargs = {
    'tool': skidl.SKIDL,
    'name': str(name),
    'pins': [Pin(num=str(i), name=str(i)) for i in range(1, pin_count + 1)],
  }
  if ref:
    kwargs['ref'] = ref
  if footprint:
    kwargs['footprint'] = footprint
  if value:
    kwargs['value'] = value
  return AutoPart(**kwargs)
`;

const OUTPUT_BLOCK_MARKER = "# AUTOSKIDL_OUTPUT_BLOCK";

const SAFE_LIBRARIES = new Set([
  "device",
  "connector_generic",
  "connector",
  "power",
  "simulation_spice",
]);

const PIN_COUNT_BY_PART_NAME: Record<string, number> = {
  "atx_24pin": 24,
  "atx_8pin": 8,
  "pciexpress_x16": 82,
  "pciexpress_x1": 18,
  "m.2_m-key": 67,
  "m2_m-key": 67,
  "sata": 7,
  "usb3.0_header": 20,
  "usb2.0_header": 9,
  "header_10pin": 10,
  "header_4pin": 4,
  "header_3pin": 3,
  "usb3.0_typea": 9,
  "audiojack": 3,
  "hdmi": 19,
  "displayport": 20,
  "eth": 12,
  "ethernet_phy": 12,
  "super_io": 16,
  "pwm_controller": 16,
  "n-channel_mosfet": 3,
  "alc1220": 32,
};

function escapePySingleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function inferPinCount(lib: string, part: string): number {
  const normalized = part.trim().toLowerCase();
  const byMap = PIN_COUNT_BY_PART_NAME[normalized];
  if (byMap) return byMap;

  const pinMatch = normalized.match(/(\d+)\s*pin/);
  if (pinMatch) return Math.max(2, Math.min(parseInt(pinMatch[1], 10), 512));

  const gridMatch = normalized.match(/conn[_-]?(\d+)x(\d+)/);
  if (gridMatch) {
    const a = parseInt(gridMatch[1], 10);
    const b = parseInt(gridMatch[2], 10);
    return Math.max(2, Math.min(a * b, 512));
  }

  const xLaneMatch = normalized.match(/x(\d+)/);
  if (xLaneMatch) {
    const lanes = parseInt(xLaneMatch[1], 10);
    if (lanes === 16) return 82;
    if (lanes === 8) return 49;
    if (lanes === 4) return 32;
    if (lanes === 1) return 18;
    return Math.max(2, Math.min(lanes, 512));
  }

  if (lib.toLowerCase().includes("connector")) return 8;
  return 16;
}

function normalizePartCalls(code: string, forceAllLibraries = false): string {
  return code.replace(
    /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Part\((.+?)\)\s*$/gm,
    (line, indent: string, varName: string, argList: string) => {
      if (/\btool\s*=\s*SKIDL\b/.test(argList)) {
        return line;
      }

      const positional = argList.match(/^\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
      if (!positional) {
        return line;
      }

      const lib = positional[1];
      const part = positional[2];
      const safeLib = SAFE_LIBRARIES.has(lib.trim().toLowerCase());

      if (safeLib && !forceAllLibraries) {
        return line;
      }

      const refMatch = argList.match(/\bref\s*=\s*['"]([^'"]+)['"]/);
      const valueMatch = argList.match(/\bvalue\s*=\s*['"]([^'"]+)['"]/);
      const footprintMatch = argList.match(/\bfootprint\s*=\s*['"]([^'"]+)['"]/);

      const pinCount = inferPinCount(lib, part);
      const pyPart = escapePySingleQuoted(part);

      const params = [
        `'${pyPart}'`,
        `${pinCount}`,
        `ref='${escapePySingleQuoted(refMatch?.[1] ?? "")}'`,
        `footprint='${escapePySingleQuoted(footprintMatch?.[1] ?? "")}'`,
        `value='${escapePySingleQuoted(valueMatch?.[1] ?? "")}'`,
      ];

      return `${indent}${varName} = _autoskidl_make_part(${params.join(", ")})`;
    }
  );
}

function hasArtifacts(files: {
  kicadPcb?: string;
  kicadSch?: string;
  netlist?: string;
  spice?: string;
  cir?: string;
  lib?: string;
}): boolean {
  return !!(
    files.kicadPcb ||
    files.kicadSch ||
    files.netlist ||
    files.spice ||
    files.cir ||
    files.lib
  );
}

interface SanitizeOptions {
  forcePartFallback?: boolean;
}

function repairCommonPluralTypos(code: string): string {
  const readNames = new Set<string>();
  const declaredNames = new Set<string>();

  for (const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\[/g)) {
    readNames.add(match[1]);
  }
  for (const match of code.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    declaredNames.add(match[1]);
  }

  let result = code;
  for (const readName of readNames) {
    if (declaredNames.has(readName)) {
      continue;
    }
    if (!readName.endsWith("s")) {
      continue;
    }

    const singular = readName.slice(0, -1);
    if (!declaredNames.has(singular)) {
      continue;
    }

    const pattern = new RegExp(`\\b${readName}\\[`, "g");
    result = result.replace(pattern, `${singular}[`);
  }

  return result;
}

/**
 * Pre-execution sanitizer: fixes common AI-generated SKiDL mistakes before running.
 *
 * 1. Rewrites inline Net('X') += ... to use a named variable, which prevents:
 *    SyntaxError: 'function call' is an illegal expression for augmented assignment
 *
 * 2. Ensures set_default_tool(KICAD6) is present.
 *
 * 3. Appends netlist/spice/pcb/schematic generators if generate_netlist() is present.
 *
 * 4. Injects MONKEY_PATCH to prevent "Unable to find part" crashes.
 */
function sanitizeSkidlCode(code: string, options: SanitizeOptions = {}): string {
  let result = code;
  const forcePartFallback = options.forcePartFallback === true;

  result = normalizePartCalls(result, forcePartFallback);
  result = repairCommonPluralTypos(result);

  // Fix: Net('X') += something  →  _net_X = Net('X')\n_net_X += something
  // Handles both single and double quotes, and variations with spaces
  result = result.replace(
    /^([ \t]*)Net\((['"])(.*?)\2\)\s*\+=/gm,
    (match, indent, quote, netName) => {
      const varName = `_net_${netName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      return `${indent}${varName} = Net(${quote}${netName}${quote})\n${indent}${varName} +=`;
    }
  );

  // Inject KICAD6 default if missing and add Monkey Patch
  if (result.includes("from skidl import *")) {
    result = result.replace(
      "from skidl import *",
      "from skidl import *\n" + (!result.includes("set_default_tool(KICAD6)") ? "set_default_tool(KICAD6)\n" : "") + MONKEY_PATCH
    );
  } else {
    // If somehow missing entirely
    result = "from skidl import *\nset_default_tool(KICAD6)\n" + MONKEY_PATCH + "\n" + result;
  }

  // Always append output generators so circuits without explicit generate_* calls still produce files.
  if (!result.includes(OUTPUT_BLOCK_MARKER)) {
    result += `

${OUTPUT_BLOCK_MARKER}
def _autoskidl_safe_generate(label, fn):
  try:
    fn()
  except Exception as e:
    print(f'AUTOSKIDL_OUTPUT_ERROR[{label}]: {e}')

_autoskidl_safe_generate('netlist', lambda: generate_netlist(file_='circuit.net'))
_autoskidl_safe_generate('spice', lambda: generate_netlist(file_='circuit.spice', tool=SPICE))
_autoskidl_safe_generate('cir', lambda: generate_netlist(file_='circuit.cir', tool=SPICE))
_autoskidl_safe_generate('pcb', lambda: generate_pcb(file_='circuit.kicad_pcb'))
_autoskidl_safe_generate('schematic', lambda: generate_schematic(file_='circuit.kicad_sch'))
`;
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
  } catch {
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
  const result: {
    kicadPcb?: string;
    kicadSch?: string;
    netlist?: string;
    spice?: string;
    schematicSvg?: string;
    gerberZipBase64?: string;
    drillZipBase64?: string;
    stepBase64?: string;
    cir?: string;
    lib?: string;
  } = {};

  const filesInDir = await readdir(workDir).catch(() => []);
  const pickByExt = (ext: string): string | undefined => {
    const preferred = ["circuit", "design", "output"];
    const matching = filesInDir.filter((f) => f.toLowerCase().endsWith(ext.toLowerCase()));
    if (matching.length === 0) return undefined;
    const preferredMatch = matching.find((f) => preferred.some((p) => f.toLowerCase().startsWith(p)));
    return preferredMatch || matching[0];
  };

  const pcbFile = pickByExt(".kicad_pcb");
  const schFile = pickByExt(".kicad_sch");
  const netFile = pickByExt(".net");
  const spiceFile = pickByExt(".spice");
  const cirFile = pickByExt(".cir");
  const libFile = pickByExt(".lib");

  if (pcbFile) result.kicadPcb = await readFile(join(workDir, pcbFile), "utf-8");
  if (schFile) {
    const schPath = join(workDir, schFile);
    result.kicadSch = await readFile(schPath, "utf-8");
    try {
      const svgPath = schPath.replace(".kicad_sch", ".svg");
      await new Promise<void>((resolve) => {
        exec(
          `kicad-cli sch export svg "${schPath}" -o "${svgPath}" --theme "kicad 2020"`,
          { cwd: workDir, timeout: 30000 },
          () => resolve()
        );
      });
      if (existsSync(svgPath)) {
        result.schematicSvg = await readFile(svgPath, "utf-8");
      }
    } catch (e) {
      console.error("[kicad-cli] Failed to generate SVG", e);
    }
  }
  if (netFile) result.netlist = await readFile(join(workDir, netFile), "utf-8");
  if (spiceFile) result.spice = await readFile(join(workDir, spiceFile), "utf-8");
  if (cirFile) result.cir = await readFile(join(workDir, cirFile), "utf-8");
  if (libFile) result.lib = await readFile(join(workDir, libFile), "utf-8");

  // Generate extras if PCB exists
  const pcbPath = pcbFile ? join(workDir, pcbFile) : "";
  if (pcbPath && existsSync(pcbPath)) {
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
  if (result.netlist && !result.spice) result.spice = result.netlist;
  if (result.netlist && !result.cir) result.cir = result.netlist;
  if (result.netlist && !result.lib) result.lib = result.netlist;

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
    let codeToRun = sanitizeSkidlCode(skidlCode);

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

      let producedAny = hasArtifacts(result);
      if (!producedAny) {
        // Forced compatibility fallback: rewrite all Part(...) calls to manual SKIDL parts.
        await rm(workDir, { recursive: true, force: true });
        await mkdir(workDir, { recursive: true });

        codeToRun = sanitizeSkidlCode(skidlCode, { forcePartFallback: true });
        execResult = await executeSkidl(codeToRun, workDir);

        if (execResult.success) {
          const fallbackFiles = await collectOutputFiles(workDir);
          result.kicadPcb = fallbackFiles.kicadPcb;
          result.kicadSch = fallbackFiles.kicadSch;
          result.netlist = fallbackFiles.netlist;
          result.spice = fallbackFiles.spice;
          result.schematicSvg = fallbackFiles.schematicSvg;
          result.gerberZipBase64 = fallbackFiles.gerberZipBase64;
          result.drillZipBase64 = fallbackFiles.drillZipBase64;
          result.stepBase64 = fallbackFiles.stepBase64;
          result.cir = fallbackFiles.cir;
          result.lib = fallbackFiles.lib;
          result.retryUsed = true;
          producedAny = hasArtifacts(result);
        }
      }

      if (!producedAny) {
        const outputLog = `${execResult.stdout}\n${execResult.stderr}`.trim();
        result.success = false;
        result.error = `Compilation ran, but no output artifacts were produced.\n\n${outputLog || "No compiler output was emitted."}`;
      }
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

            const producedAny = hasArtifacts(result);
            if (!producedAny) {
              result.success = false;
              const outputLog = `${execResult.stdout}\n${execResult.stderr}`.trim();
              result.error = `Auto-fix execution completed, but no output artifacts were produced.\n\n${outputLog || "No compiler output was emitted."}`;
            }
          } else {
            result.error = `Original error:\n${errorOutput}\n\nRetry error:\n${execResult.stdout}\n${execResult.stderr}`.trim();
          }
        } catch (fixError) {
          const fixErrorMsg = fixError instanceof Error ? fixError.message : "Unknown error";
          console.error("[/api/compile] Auto-fix failed:", fixErrorMsg);
          console.error("[/api/compile] Full error:", fixError);
          console.error("[/api/compile] Model:", model);
          console.error("[/api/compile] Has custom API key:", !!apiKey);
          result.error = `${errorOutput}\n\nAuto-fix attempt failed: ${fixErrorMsg}`;
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[/api/compile] Error:", message);
    console.error("[/api/compile] Full error:", error);
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