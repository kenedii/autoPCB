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
import db from "@/lib/db";
import JSZip from "jszip";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const MONKEY_PATCH = `
import skidl
from skidl.part import Part as OriginalPart
from skidl.pin import Pin
import sys

# Registry to track all dynamically created components
_AUTOSKIDL_REGISTRY = {}

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
      
      _AUTOSKIDL_REGISTRY[name] = self

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
  part = AutoPart(**kwargs)
  _AUTOSKIDL_REGISTRY[name] = part
  return part

# Custom __getattr__ for module to provide fallback component creation
class ComponentRegistry(dict):
  def __getitem__(self, key):
    try:
      return super().__getitem__(key)
    except KeyError:
      # Create a fallback part dynamically if not found
      part = _autoskidl_make_part(key)
      self[key] = part
      return part
  
  def __getattr__(self, key):
    if key.startswith('_'):
      return object.__getattribute__(self, key)
    try:
      return self[key]
    except KeyError:
      part = _autoskidl_make_part(key)
      self[key] = part
      return part

# Register this module as the fallback namespace
_registry = ComponentRegistry(_AUTOSKIDL_REGISTRY)
sys.modules['__main__'].__dict__.update(_registry)
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
 * Detects variable references that would cause NameError
 * Returns a script prefix that defines missing variables as empty lists/dicts
 */
function createMissingVarDefinitions(code: string): string {
  const declaredVars = new Set<string>();
  const referencedVars = new Set<string>();

  // Find all variable declarations (assignment targets)
  for (const match of code.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    declaredVars.add(match[1]);
  }
  
  // Find all function definitions
  for (const match of code.matchAll(/^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm)) {
    declaredVars.add(match[1]);
  }

  // Find all variable references
  for (const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*[+\-*/.=\[\(,]|\b([A-Za-z_][A-Za-z0-9_]*)\s*$/gm)) {
    const varName = match[1] || match[2];
    if (varName && !varName.match(/^(if|for|while|def|class|import|from|return|try|except|raise|with|as|and|or|not|is|in|lambda|yield|pass|break|continue|True|False|None|print|len|range|list|dict|set|str|int|float|bool)$/)) {
      referencedVars.add(varName);
    }
  }

  const missingVars = Array.from(referencedVars).filter(v => !declaredVars.has(v));

  if (missingVars.length === 0) return "";

  // Create fallback definitions
  const definitions = missingVars
    .map(v => {
      // Detect if it should be a dict, list, or component
      if (code.match(new RegExp(`\\b${v}\\s*\\[`, "g"))) {
        return `${v} = {}  # Auto-generated fallback for missing variable`;
      } else if (code.match(new RegExp(`\\b${v}\\s*\\.\\w+\\s*\\(`, "g"))) {
        // Looks like a method call, make it a fallback component
        return `${v} = _autoskidl_make_part('${v}')  # Auto-generated fallback component`;
      }
      return `${v} = None  # Auto-generated fallback for missing variable`;
    })
    .join("\n");

  return definitions + "\n";
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
 * 
 * 5. Adds fallback definitions for undefined variables to prevent NameError
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

  // Add fallback definitions for undefined variables AFTER monkey patch so they can use _autoskidl_make_part
  const varDefs = createMissingVarDefinitions(result);
  if (varDefs) {
    // Insert after MONKEY_PATCH but before user code
    const monkeyPatchEnd = result.indexOf(MONKEY_PATCH) + MONKEY_PATCH.length;
    result = result.slice(0, monkeyPatchEnd) + "\n" + varDefs + result.slice(monkeyPatchEnd);
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

async function buildCompileFinishedEmailHtml(options: {
  recipientEmail: string;
  appUrl: string;
  artifacts: string[];
  retryUsed: boolean;
}): Promise<string> {
  const { recipientEmail, appUrl, artifacts, retryUsed } = options;
  
  // Build artifact items
  const artifactItems = artifacts.length
    ? artifacts
        .map(
          (name) =>
            `<li style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;background:#ffffff;color:#0f172a;font-size:13px;">${name}</li>`
        )
        .join("")
    : `<li style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;color:#475569;font-size:13px;">No artifacts were detected.</li>`;

  // Load template
  const templatePath = join(process.cwd(), "src/utils/emailtemplates/compile-complete.html");
  let template = await readFile(templatePath, "utf-8");

  // Replace placeholders
  template = template.replace("{{recipientEmail}}", recipientEmail);
  template = template.replace("{{appUrl}}", appUrl);
  template = template.replace("{{artifactItems}}", artifactItems);
  template = template.replace("{{retryUsedText}}", retryUsed ? " after an automatic retry" : "");

  return template;
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

  // Create fallback configuration files
  const fpLibTableContent = `(fp_lib_table
  (lib (name "device") (type "Legacy") (uri "\${KICAD_FOOTPRINT_DIR}/device.pretty") (options "") (descr "Common device footprints"))
  (lib (name "connector") (type "Legacy") (uri "\${KICAD_FOOTPRINT_DIR}/Connector.pretty") (options "") (descr "Connector footprints"))
  (lib (name "power") (type "Legacy") (uri "\${KICAD_FOOTPRINT_DIR}/Power_Connectors.pretty") (options "") (descr "Power connector footprints"))
)`;

  const symLibTableContent = `(sym_lib_table
  (lib (name "device") (type "Legacy") (uri "\${KICAD_SYMBOL_DIR}/device.lib") (options "") (descr "Common device symbols"))
  (lib (name "connector") (type "Legacy") (uri "\${KICAD_SYMBOL_DIR}/connector.lib") (options "") (descr "Connector symbols"))
  (lib (name "power") (type "Legacy") (uri "\${KICAD_SYMBOL_DIR}/power.lib") (options "") (descr "Power symbols"))
  (lib (name "simulation_spice") (type "Legacy") (uri "\${KICAD_SYMBOL_DIR}/simulation_spice.lib") (options "") (descr "SPICE simulation symbols"))
)`;

  // Copy template tables to workdir to resolve SKiDL warnings
  try {
    if (isWin) {
      // Find template
      const versions = ["9.0", "8.0", "7.0", "6.0"];
      let found = false;
      for (const v of versions) {
        const tpl = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\template\\fp-lib-table`;
        if (existsSync(tpl)) {
          await writeFile(join(workDir, "fp-lib-table"), await readFile(tpl, "utf-8"));
          found = true;
        }
        const symTpl = `C:\\Program Files\\KiCad\\${v}\\share\\kicad\\template\\sym-lib-table`;
        if (existsSync(symTpl)) {
          await writeFile(join(workDir, "sym-lib-table"), await readFile(symTpl, "utf-8"));
          break;
        }
      }
      // If files weren't found, write fallbacks
      if (!found) {
        await writeFile(join(workDir, "fp-lib-table"), fpLibTableContent);
        await writeFile(join(workDir, "sym-lib-table"), symLibTableContent);
      }
    } else {
      if (existsSync("/usr/share/kicad/template/fp-lib-table")) {
        await writeFile(join(workDir, "fp-lib-table"), await readFile("/usr/share/kicad/template/fp-lib-table", "utf-8"));
      } else {
        await writeFile(join(workDir, "fp-lib-table"), fpLibTableContent);
      }
      if (existsSync("/usr/share/kicad/template/sym-lib-table")) {
        await writeFile(join(workDir, "sym-lib-table"), await readFile("/usr/share/kicad/template/sym-lib-table", "utf-8"));
      } else {
        await writeFile(join(workDir, "sym-lib-table"), symLibTableContent);
      }
    }
  } catch (e) {
    // If copy fails, ensure fallback files exist
    try {
      if (!existsSync(join(workDir, "fp-lib-table"))) {
        await writeFile(join(workDir, "fp-lib-table"), fpLibTableContent);
      }
      if (!existsSync(join(workDir, "sym-lib-table"))) {
        await writeFile(join(workDir, "sym-lib-table"), symLibTableContent);
      }
    } catch {
      // Ignore if not accessible
    }
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

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, compileEmailEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

      // Check if error is a NameError or other undefined reference
      const isNameError = /NameError:|undefined|not defined/.test(errorOutput);
      const isMissingLibrary = /Could not load KiCad|WARNING:|can't open file/i.test(errorOutput);

      if (isNameError || isMissingLibrary || true) { // Always try to fix
        try {
          const fixPrompt = FIX_PROMPT
            .replace("{code}", skidlCode)
            .replace("{error}", errorOutput);

          const messages: ChatMessage[] = [
            { role: "system", content: fixPrompt },
            {
              role: "user",
              content: "Fix this SKiDL code based on the error above. Ensure all variables are properly defined before use.",
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

          // Use aggressive sanitization for NameError cases
          const useAggressiveSanitization = isNameError;
          const retryCodeToRun = sanitizeSkidlCode(cleanFixed, { forcePartFallback: useAggressiveSanitization });

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

    if (result.success && user.compileEmailEnabled && process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const forcedRecipient = process.env.RESEND_TEST_EMAIL?.trim();
        const recipient = forcedRecipient || user.email;
        const artifacts = [
          result.kicadPcb ? "circuit.kicad_pcb" : null,
          result.kicadSch ? "circuit.kicad_sch" : null,
          result.netlist ? "circuit.net" : null,
          result.spice ? "circuit.spice" : null,
          result.schematicSvg ? "circuit.svg" : null,
          result.gerberZipBase64 ? "gerber.zip" : null,
          result.drillZipBase64 ? "drill.zip" : null,
          result.stepBase64 ? "circuit.step" : null,
        ].filter(Boolean) as string[];

        const html = await buildCompileFinishedEmailHtml({
          recipientEmail: user.email,
          appUrl,
          artifacts,
          retryUsed: !!result.retryUsed,
        });

        const { data, error } = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: recipient,
          subject: "Your AutoPCB compile is complete",
          html,
        });

        if (error) {
          console.error("[/api/compile][Email] Resend error:", JSON.stringify(error, null, 2));
        } else {
          console.log(`[/api/compile][Email] Notification sent. id=${data?.id ?? "unknown"} recipient=${recipient}`);
        }
      } catch (emailError) {
        console.error("[/api/compile][Email] Unexpected error:", emailError);
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