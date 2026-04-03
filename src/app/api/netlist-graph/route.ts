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
 * Parses a KiCad .net XML string into a JSON graph of components and nets.
 * The .net format looks like:
 * <export>
 *   <components>
 *     <comp ref="R1"><value>330</value><footprint>...</footprint></comp>
 *   </components>
 *   <nets>
 *     <net code="1" name="VCC">
 *       <node ref="R1" pin="1"/>
 *     </net>
 *   </nets>
 * </export>
 */
function parseNetlistXml(xml: string): NetlistGraph {
  const components: ComponentNode[] = [];
  const nets: NetEdge[] = [];

  // Parse components
  const compMatches = xml.matchAll(/<comp\s+ref="([^"]+)"[^>]*>([\s\S]*?)<\/comp>/g);
  for (const m of compMatches) {
    const ref = m[1];
    const body = m[2];
    const valueMatch = body.match(/<value>([^<]*)<\/value>/);
    const footprintMatch = body.match(/<footprint>([^<]*)<\/footprint>/);
    components.push({
      ref,
      value: valueMatch?.[1] || "",
      footprint: footprintMatch?.[1] || "",
      pins: [],
    });
  }

  // Parse nets
  const netMatches = xml.matchAll(/<net\s+code="([^"]+)"\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/net>/g);
  for (const m of netMatches) {
    const code = m[1];
    const name = m[2];
    const body = m[3];
    const pinMatches = [...body.matchAll(/<node\s+ref="([^"]+)"\s+pin="([^"]+)"[^/]*/g)];
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
