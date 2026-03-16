"use client";

import React from "react";
import {
  Cpu,
  Download,
  ChevronDown,
  Zap,
} from "lucide-react";

interface HeaderProps {
  model: string;
  onModelChange: (model: string) => void;
  onExport: () => void;
  isExporting: boolean;
  hasCode: boolean;
}

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

export default function Header({
  model,
  onModelChange,
  onExport,
  isExporting,
  hasCode,
}: HeaderProps) {
  return (
    <header
      className="glass"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid var(--border-primary)",
        borderRadius: 0,
        zIndex: 100,
      }}
    >
      {/* Logo / Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Cpu size={20} color="white" />
        </div>
        <div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            <span className="gradient-text">AutoPCB</span>
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            AI-Powered PCB Designer
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Model Selector */}
        <div className="select-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={14} style={{ color: "var(--accent-warning)" }} />
          <select
            className="select-native"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "10px",
              pointerEvents: "none",
              color: "var(--text-muted)",
            }}
          />
        </div>

        {/* Export Button */}
        <button
          className="btn-primary"
          onClick={onExport}
          disabled={!hasCode || isExporting}
          style={{ fontSize: "13px", padding: "8px 16px" }}
        >
          <Download size={15} />
          {isExporting ? "Exporting..." : "Export ZIP"}
        </button>
      </div>
    </header>
  );
}
