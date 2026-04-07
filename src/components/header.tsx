"use client";

import React from "react";
import {
  Download,
  ChevronDown,
  Zap,
} from "lucide-react";

interface HeaderProps {
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onExport: () => void;
  isExporting: boolean;
  hasCode: boolean;
  agentResponsesEnabled: boolean;
  onAgentResponsesToggle: (enabled: boolean) => void;
}

const MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

export default function Header({
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  onExport,
  isExporting,
  hasCode,
  agentResponsesEnabled,
  onAgentResponsesToggle,
}: HeaderProps) {
  return (
    <header
      className="glass"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid var(--border-primary)",
        borderRadius: 0,
        zIndex: 100,
      }}
    >
      {/* Controls - Pushed to the right */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
        
        {/* API Key Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="password"
            placeholder="Custom API Key (Optional)"
            className="input-text"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            style={{ width: "200px", padding: "6px 12px", fontSize: "13px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
          />
        </div>

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

        {/* Agent Response Toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 600,
            userSelect: "none",
          }}
        >
          Agent Replies
          <button
            type="button"
            onClick={() => onAgentResponsesToggle(!agentResponsesEnabled)}
            aria-label="Toggle agent replies"
            aria-pressed={agentResponsesEnabled}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "999px",
              border: "1px solid var(--border-primary)",
              background: agentResponsesEnabled ? "var(--accent-success)" : "var(--bg-elevated)",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "white",
                position: "absolute",
                top: "2px",
                left: agentResponsesEnabled ? "22px" : "2px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </label>

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
