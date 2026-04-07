"use client";

import React from "react";
import {
  Download,
  ChevronDown,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

type GenerationParams = {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxTokens: number;
  planningMaxTokens: number;
};

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
  generationParams: GenerationParams;
  onGenerationParamsChange: (params: GenerationParams) => void;
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
  generationParams,
  onGenerationParamsChange,
}: HeaderProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const updateNumberParam = (key: keyof GenerationParams, value: number, min: number, max: number) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const normalized = Math.min(Math.max(value, min), max);
    onGenerationParamsChange({
      ...generationParams,
      [key]: key.includes("Tokens") ? Math.floor(normalized) : normalized,
    });
  };

  return (
    <header
      className="glass"
      style={{
        display: "flex",
        alignItems: "flex-start",
        flexDirection: "column",
        padding: "12px 24px",
        borderBottom: "1px solid var(--border-primary)",
        borderRadius: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto", width: "100%", justifyContent: "flex-end", flexWrap: "wrap" }}>
        
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

        <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowAdvanced((prev) => !prev)}
          style={{ fontSize: "12px", padding: "8px 12px" }}
        >
          <SlidersHorizontal size={14} />
          {showAdvanced ? "Hide Advanced" : "Advanced"}
        </button>

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

      {showAdvanced && (
        <div
          style={{
            marginTop: "10px",
            width: "100%",
            borderTop: "1px solid var(--border-primary)",
            paddingTop: "10px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Temperature ({generationParams.temperature.toFixed(2)})
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={generationParams.temperature}
              onChange={(e) => updateNumberParam("temperature", Number(e.target.value), 0, 2)}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Top P ({generationParams.topP.toFixed(2)})
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={generationParams.topP}
              onChange={(e) => updateNumberParam("topP", Number(e.target.value), 0, 1)}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Frequency Penalty ({generationParams.frequencyPenalty.toFixed(2)})
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={generationParams.frequencyPenalty}
              onChange={(e) => updateNumberParam("frequencyPenalty", Number(e.target.value), -2, 2)}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Presence Penalty ({generationParams.presencePenalty.toFixed(2)})
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={generationParams.presencePenalty}
              onChange={(e) => updateNumberParam("presencePenalty", Number(e.target.value), -2, 2)}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Code Max Tokens
            <input
              className="input-text"
              type="number"
              min={256}
              max={32768}
              step={256}
              value={generationParams.maxTokens}
              onChange={(e) => updateNumberParam("maxTokens", Number(e.target.value), 256, 32768)}
              style={{ padding: "6px 10px", fontSize: "12px" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Planner Max Tokens
            <input
              className="input-text"
              type="number"
              min={256}
              max={16384}
              step={256}
              value={generationParams.planningMaxTokens}
              onChange={(e) => updateNumberParam("planningMaxTokens", Number(e.target.value), 256, 16384)}
              style={{ padding: "6px 10px", fontSize: "12px" }}
            />
          </label>
        </div>
      )}
    </header>
  );
}
