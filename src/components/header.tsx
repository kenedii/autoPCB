"use client";

import React from "react";
import {
  Download,
  Upload,
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

const LARGE_BOARD_PRESET: GenerationParams = {
  temperature: 0.2,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 24576,
  planningMaxTokens: 6144,
};

const DEFAULT_PRESET: GenerationParams = {
  temperature: 0.3,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 12288,
  planningMaxTokens: 3072,
};

interface HeaderProps {
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onExport: () => void;
  isExporting: boolean;
  onLoadSession: (file: File) => void;
  isLoadingSession: boolean;
  hasCode: boolean;
  agentResponsesEnabled: boolean;
  onAgentResponsesToggle: (enabled: boolean) => void;
  generationParams: GenerationParams;
  onGenerationParamsChange: (params: GenerationParams) => void;
}

const MODEL_GROUPS = [
  {
    label: "OpenAI",
    models: [
      { value: "gpt-5", label: "GPT-5" },
      { value: "gpt-5-mini", label: "GPT-5 Mini" },
      { value: "gpt-5-nano", label: "GPT-5 Nano (Budget)" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    ],
  },
  {
    label: "DeepSeek",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    label: "Claude (OpenRouter)",
    models: [
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
    ],
  },
  {
    label: "Gemini (OpenRouter)",
    models: [
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    label: "Qwen (OpenRouter)",
    models: [
      { value: "qwen/qwen3-235b-a22b", label: "Qwen3 235B" },
      { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
    ],
  },
];

const QUICK_MODEL_LIST = MODEL_GROUPS.flatMap((group) => group.models);
const KNOWN_MODEL_VALUES = new Set(QUICK_MODEL_LIST.map((m) => m.value));

export default function Header({
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  onExport,
  isExporting,
  onLoadSession,
  isLoadingSession,
  hasCode,
  agentResponsesEnabled,
  onAgentResponsesToggle,
  generationParams,
  onGenerationParamsChange,
}: HeaderProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [customModel, setCustomModel] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
            {!KNOWN_MODEL_VALUES.has(model) && (
              <option value={model}>{`Custom: ${model}`}</option>
            )}
            {MODEL_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onLoadSession(file);
            e.currentTarget.value = "";
          }}
        />

        <button
          className="btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingSession}
          style={{ fontSize: "13px", padding: "8px 16px" }}
        >
          <Upload size={15} />
          {isLoadingSession ? "Loading..." : "Load ZIP"}
        </button>

        {/* Export Button */}
        <button
          className="btn-primary"
          onClick={onExport}
          disabled={!hasCode || isExporting}
          style={{ fontSize: "13px", padding: "8px 16px" }}
        >
          <Download size={15} />
          {isExporting ? "Saving..." : "Save Session ZIP"}
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
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => onGenerationParamsChange(LARGE_BOARD_PRESET)}
                style={{ fontSize: "12px", padding: "6px 10px" }}
              >
                Large Board Mode
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onGenerationParamsChange(DEFAULT_PRESET)}
                style={{ fontSize: "12px", padding: "6px 10px" }}
              >
                Reset Defaults
              </button>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-secondary)",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                Model Settings
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {QUICK_MODEL_LIST.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className="btn-ghost"
                    onClick={() => onModelChange(m.value)}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderColor: model === m.value ? "var(--accent-secondary)" : "var(--border-primary)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  className="input-text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Custom model name (for unlisted models)"
                  style={{ minWidth: "280px", flex: 1, padding: "6px 10px", fontSize: "12px" }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const value = customModel.trim();
                    if (!value) return;
                    onModelChange(value);
                  }}
                  style={{ fontSize: "12px", padding: "6px 10px" }}
                >
                  Use Custom
                </button>
              </div>
            </div>

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
