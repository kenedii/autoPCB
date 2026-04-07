"use client";

import React, { useEffect, useMemo, useState } from "react";

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

interface Props {
  netlistXml: string;
}

const BOX_WIDTH = 170;
const BOX_HEIGHT = 68;

export default function WiringDiagramViewer({ netlistXml }: Props) {
  const [graph, setGraph] = useState<NetlistGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!netlistXml) return;

    fetch("/api/netlist-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ netlistXml }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setError(null);
        setGraph(data);
      })
      .catch((err) => setError(err.message || "Failed to render wiring diagram"))
      .finally(() => {
        // no-op
      });
  }, [netlistXml]);

  const layout = useMemo(() => {
    if (!graph) return null;

    const byDensity = [...graph.components].sort((a, b) => {
      const aCount = graph.nets.filter((n) => n.pins.some((p) => p.ref === a.ref)).length;
      const bCount = graph.nets.filter((n) => n.pins.some((p) => p.ref === b.ref)).length;
      return bCount - aCount;
    });

    const positions = new Map<string, { x: number; y: number }>();
    const columns = Math.max(2, Math.ceil(Math.sqrt(byDensity.length)));

    byDensity.forEach((c, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      positions.set(c.ref, {
        x: 30 + col * (BOX_WIDTH + 70),
        y: 30 + row * (BOX_HEIGHT + 70),
      });
    });

    return {
      positions,
      width: columns * (BOX_WIDTH + 70) + 40,
      height: Math.ceil(byDensity.length / columns) * (BOX_HEIGHT + 70) + 40,
    };
  }, [graph]);

  if (!graph && !error) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Building wiring diagram...</div>;
  }

  if (error) {
    return <div style={{ color: "var(--accent-error)", fontSize: 12 }}>{error}</div>;
  }

  if (!graph || !layout) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No netlist available for wiring view.</div>;
  }

  return (
    <div
      style={{
        flex: 1,
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-color)",
        overflow: "auto",
        background:
          "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.08), transparent 40%), linear-gradient(180deg, #0c111b, #0b1019)",
      }}
    >
      <svg width={layout.width} height={layout.height}>
        {graph.nets.slice(0, 120).map((net, i) => {
          if (net.pins.length < 2) return null;
          const color = `hsl(${(i * 47) % 360} 70% 62%)`;
          const points = net.pins
            .map((pin) => {
              const pos = layout.positions.get(pin.ref);
              if (!pos) return null;
              return {
                x: pos.x + BOX_WIDTH / 2,
                y: pos.y + BOX_HEIGHT / 2,
              };
            })
            .filter(Boolean) as { x: number; y: number }[];

          if (points.length < 2) return null;

          return (
            <g key={net.name + i}>
              {points.slice(1).map((p, idx) => {
                const p0 = points[0];
                const mx = (p0.x + p.x) / 2;
                return (
                  <path
                    key={`${net.name}-${idx}`}
                    d={`M ${p0.x} ${p0.y} L ${mx} ${p0.y} L ${mx} ${p.y} L ${p.x} ${p.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    strokeOpacity={0.75}
                  />
                );
              })}
              <text x={points[0].x + 8} y={points[0].y - 8} fontSize={9} fill={color} fontFamily="monospace">
                {net.name}
              </text>
            </g>
          );
        })}

        {graph.components.map((comp) => {
          const pos = layout.positions.get(comp.ref);
          if (!pos) return null;

          return (
            <g key={comp.ref} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={BOX_WIDTH}
                height={BOX_HEIGHT}
                rx={10}
                ry={10}
                fill="rgba(27, 37, 56, 0.95)"
                stroke="rgba(148, 163, 184, 0.45)"
              />
              <text x={12} y={24} fill="#dbeafe" fontWeight="bold" fontFamily="monospace" fontSize={12}>
                {comp.ref}
              </text>
              <text x={12} y={42} fill="#94a3b8" fontFamily="monospace" fontSize={10}>
                {(comp.value || "Unnamed").slice(0, 22)}
              </text>
              <text x={12} y={58} fill="#64748b" fontFamily="monospace" fontSize={9}>
                Pins: {comp.pins.length}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
