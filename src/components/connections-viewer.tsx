"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

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

export default function ConnectionsViewer({ netlistXml }: { netlistXml: string }) {
  const [graph, setGraph] = useState<NetlistGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!netlistXml) return;
    setLoading(true);
    fetch("/api/netlist-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ netlistXml }),
    })
      .then((r) => r.json())
      .then((data) => setGraph(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [netlistXml]);

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading connections...</div>;
  if (!graph) return <div className="p-4 flex-1 text-sm text-gray-400">No components found.</div>;

  const filteredNets = graph.nets.filter(n => 
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.pins.some(p => p.ref.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4 h-full bg-[#0d1117] rounded-md border border-[var(--border-color)] p-4 overflow-hidden text-sm">
      <div className="flex items-center gap-2 border border-[var(--border-color)] bg-[#1e2838] px-3 py-1.5 rounded-md text-white">
        <Search size={14} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search nets or components..." 
          className="bg-transparent border-none outline-none flex-1 placeholder-gray-500 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto rounded border border-[var(--border-color)] bg-[#1e2838]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[#111827]">
              <th className="p-3 text-gray-300 font-medium">Net Name</th>
              <th className="p-3 text-gray-300 font-medium whitespace-nowrap">Connected To</th>
            </tr>
          </thead>
          <tbody>
            {filteredNets.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-center text-gray-500">No connections found.</td>
              </tr>
            ) : (
              filteredNets.map((net, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#2d3748] transition-colors">
                  <td className="p-3 font-mono text-blue-400 align-top">{net.name}</td>
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {net.pins.map((pin, j) => {
                        const comp = graph.components.find(c => c.ref === pin.ref);
                        return (
                          <div key={j} className="bg-[#111827] px-2 py-1 rounded text-gray-300 border border-gray-700">
                            <span className="text-emerald-400 font-bold">{pin.ref}</span>
                            <span className="text-gray-500">.</span>
                            <span className="text-gray-200">{pin.pin}</span>
                            {comp ? <span className="text-gray-500 ml-1">({comp.value})</span> : ""}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
