"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const IMAGE_MAP: Record<string, string> = {
  R: "/images/components/3d_resistor_component_1775187510307.png",
  C: "/images/components/3d_capacitor_component_1775187524858.png",
  U: "/images/components/3d_ic_component_1775187554153.png",
};

function getIconForRef(ref: string) {
  if (ref.startsWith("R")) return IMAGE_MAP.R;
  if (ref.startsWith("C")) return IMAGE_MAP.C;
  return IMAGE_MAP.U; // Default to IC for others
}

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
  // layout position (set after parsing)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface NetlistGraph {
  components: ComponentNode[];
  nets: NetEdge[];
}

interface NetlistViewerProps {
  netlistXml: string;
}

const COLORS = [
  "#60a5fa", "#34d399", "#f59e0b", "#f87171",
  "#a78bfa", "#fb923c", "#38bdf8", "#4ade80",
  "#e879f9", "#facc15",
];

const COMP_W = 120;
const COMP_H = 60;
const COLS = 4;
const H_GAP = 60;
const V_GAP = 80;

function layoutGraph(graph: NetlistGraph): NetlistGraph {
  const comps = graph.components.map((c, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      ...c,
      x: 40 + col * (COMP_W + H_GAP),
      y: 40 + row * (COMP_H + V_GAP),
      width: COMP_W,
      height: COMP_H,
    };
  });
  return { ...graph, components: comps };
}

function getPinPos(comp: ComponentNode, pinIndex: number, totalPins: number, side: "left" | "right") {
  const cx = comp.x! + (side === "left" ? 0 : comp.width!);
  const cy = comp.y! + COMP_H / 2;
  if (totalPins <= 1) return { x: cx, y: cy };
  const step = COMP_H / (totalPins + 1);
  return { x: cx, y: comp.y! + step * (pinIndex + 1) };
}

export default function NetlistViewer({ netlistXml }: NetlistViewerProps) {
  const [graph, setGraph] = useState<NetlistGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!netlistXml) return;
    setLoading(true);
    setError(null);
    fetch("/api/netlist-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ netlistXml }),
    })
      .then((r) => r.json())
      .then((data: NetlistGraph) => {
        if ((data as any).error) throw new Error((data as any).error);
        setGraph(layoutGraph(data));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [netlistXml]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Parsing netlist...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, padding: 12, color: "var(--accent-error)", fontSize: 12, fontFamily: "monospace" }}>
        Failed to parse netlist: {error}
      </div>
    );
  }

  if (!graph || graph.components.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No components found in netlist.
      </div>
    );
  }

  // Build net-to-pin-center mapping for drawing edges
  const compMap = new Map(graph.components.map((c) => [c.ref, c]));

  // Calculate canvas dimensions
  const maxX = Math.max(...graph.components.map((c) => c.x! + COMP_W)) + 80;
  const maxY = Math.max(...graph.components.map((c) => c.y! + COMP_H)) + 80;

  // For each net, generate edges between consecutive pin pairs
  const edges: { x1: number; y1: number; x2: number; y2: number; netName: string; color: string }[] = [];
  graph.nets.forEach((net, ni) => {
    const color = COLORS[ni % COLORS.length];
    const positions: { x: number; y: number }[] = [];
    net.pins.forEach((p) => {
      const comp = compMap.get(p.ref);
      if (!comp) return;
      const totalPins = comp.pins.length;
      const pinIdx = comp.pins.indexOf(p.pin);
      const side = pinIdx < Math.ceil(totalPins / 2) ? "left" : "right";
      positions.push(getPinPos(comp, Math.min(pinIdx, totalPins - 1), totalPins, side));
    });
    for (let i = 0; i < positions.length - 1; i++) {
      edges.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[i + 1].x, y2: positions[i + 1].y, netName: net.name, color });
    }
  });

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        background: "#0d1117",
        minHeight: 320,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      {/* Controls */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", gap: 4 }}>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 4, width: 28, height: 28, cursor: "pointer", fontSize: 16 }}
        >+</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 4, width: 28, height: 28, cursor: "pointer", fontSize: 16 }}
        >−</button>
        <button
          onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 4, padding: "0 8px", height: 28, cursor: "pointer", fontSize: 11 }}
        >Reset</button>
      </div>

      {/* Legend */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, display: "flex", flexDirection: "column", gap: 3, maxHeight: 200, overflow: "auto" }}>
        {graph.nets.slice(0, 10).map((net, i) => (
          <div key={net.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#ccc" }}>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
            <span style={{ fontFamily: "monospace" }}>{net.name}</span>
          </div>
        ))}
        {graph.nets.length > 10 && (
          <div style={{ fontSize: 10, color: "#666" }}>+{graph.nets.length - 10} more nets</div>
        )}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 100% 100%`}
        style={{ display: "block", position: "absolute", inset: 0 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Render net edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.color}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              strokeDasharray={e.x1 === e.x2 || e.y1 === e.y2 ? undefined : "4 2"}
              onMouseEnter={(ev) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (rect) {
                  setTooltip({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, text: `Net: ${e.netName}` });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}
            />
          ))}

          {/* Render component nodes */}
          {graph.components.map((comp) => (
            <g key={comp.ref} transform={`translate(${comp.x},${comp.y})`}>
              {/* Node box */}
              <rect
                width={COMP_W} height={COMP_H}
                rx={6} ry={6}
                fill="rgba(30,40,56,0.95)"
                stroke="rgba(99,130,180,0.5)"
                strokeWidth={1.5}
              />
              {/* 3D Icon Image */}
              <image
                href={getIconForRef(comp.ref)}
                x={6} y={15} width={30} height={30}
              />
              {/* Ref label */}
              <text
                x={COMP_W / 2 + 14} y={22}
                textAnchor="middle"
                fill="#93c5fd"
                fontSize={11}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {comp.ref}
              </text>
              {/* Value label */}
              <text
                x={COMP_W / 2 + 14} y={38}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={9}
                fontFamily="monospace"
              >
                {comp.value || comp.footprint.split(":")[0] || ""}
              </text>
              {/* Footprint label */}
              <text
                x={COMP_W / 2 + 14} y={52}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={8}
                fontFamily="monospace"
              >
                {comp.footprint.split(":")[1]?.substring(0, 16) || ""}
              </text>
              {/* Hover area for tooltip */}
              <rect
                width={COMP_W} height={COMP_H}
                rx={6} ry={6}
                fill="transparent"
                onMouseEnter={(ev) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    const connected = graph.nets.filter(n => n.pins.some(p => p.ref === comp.ref));
                    const pinInfo = connected.map(n => `- Pin ${n.pins.find(p=>p.ref===comp.ref)?.pin}: ${n.name}`).join("\n");
                    setTooltip({
                      x: ev.clientX - rect.left,
                      y: ev.clientY - rect.top,
                      text: `${comp.ref}: ${comp.value}\n${comp.footprint}\nConnections:\n${pinInfo || "None"}`
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: "rgba(17,24,39,0.97)",
            border: "1px solid rgba(99,130,180,0.4)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 11,
            color: "#e5e7eb",
            fontFamily: "monospace",
            pointerEvents: "none",
            whiteSpace: "pre-line",
            zIndex: 999,
            maxWidth: 220,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Footer hint */}
      <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "#4b5563", pointerEvents: "none" }}>
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
