"use client";

import React from "react";
import { Code2, Copy, Check } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "13px",
      }}
    >
      Loading editor...
    </div>
  ),
});

interface CodePanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  isGenerating: boolean;
}

export default function CodePanel({
  code,
  onCodeChange,
  isGenerating,
}: CodePanelProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div className="panel-header">
        <Code2 size={14} style={{ color: "var(--accent-success)" }} />
        <span>SKiDL Code</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 400,
            color: "var(--text-muted)",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          circuit.py
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {isGenerating && (
            <span className="status-badge status-badge--loading" style={{ fontSize: "10px", padding: "2px 8px" }}>
              Generating...
            </span>
          )}
          <button
            className="btn-ghost"
            onClick={handleCopy}
            disabled={!code}
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {isGenerating && (
          <div
            className="animate-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        )}

        <MonacoEditor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(value) => onCodeChange(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            contextmenu: false,
            automaticLayout: true,
            fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            renderLineHighlight: "gutter",
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}
