import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

interface NetPin {
  ref: string;
  pin: string;
}

interface NetEdge {
  name: string;
  code: string;
  pins: NetPin[];
}

interface ComponentNode {
  ref: string;
  value: string;
  footprint: string;
  pins: string[];
}

interface NetlistGraph {
  components: ComponentNode[];
  nets: NetEdge[];
}

/**
 * Parses a KiCad .net S-expression string into a JSON graph of components and nets.
 */
function parseNetlistXml(xml: string): NetlistGraph {
  const components: ComponentNode[] = [];
  const nets: NetEdge[] = [];

  // Parse components from S-expression
  // (comp (ref "R1") (value "330") (footprint "...") ...)
  const compMatches = xml.matchAll(/\(comp\s+\(ref\s+"([^"]+)"\)\s+\(value\s+"([^"]*)"\)(?:[\s\S]*?\(footprint\s+"([^"]*)"\))?/g);
  for (const m of compMatches) {
    const ref = m[1];
    const value = m[2];
    const footprint = m[3] || "";
    components.push({
      ref,
      value,
      footprint,
      pins: [],
    });
  }

  // Parse nets from S-expression
  // (net (code 1) (name "VCC") (node (ref "R1") (pin "1")) ...)
  const netMatches = xml.matchAll(/\(net\s+\(code\s+(\d+)\)\s+\(name\s+"([^"]+)"\)([\s\S]*?)(?=\(net\s+\(code|\)$)/g);
  for (const m of netMatches) {
    const code = m[1];
    const name = m[2];
    const body = m[3];
    
    const pinMatches = [...body.matchAll(/\(node\s+\(ref\s+"([^"]+)"\)\s+\(pin\s+"([^"]+)"\)/g)];
    const pins: NetPin[] = pinMatches.map((pm) => ({ ref: pm[1], pin: pm[2] }));

    // Associate pins back to components
    for (const pin of pins) {
      const comp = components.find((c) => c.ref === pin.ref);
      if (comp && !comp.pins.includes(pin.pin)) {
        comp.pins.push(pin.pin);
      }
    }

    nets.push({ name, code, pins });
  }

  return { components, nets };
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { netlistXml } = body;

    if (!netlistXml || typeof netlistXml !== "string") {
      return NextResponse.json({ error: "netlistXml is required" }, { status: 400 });
    }

    const graph = parseNetlistXml(netlistXml);
    return NextResponse.json(graph);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
