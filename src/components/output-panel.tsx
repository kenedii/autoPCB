"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  FileCode2,
  RotateCw,
  Terminal,
  PlayCircle,
} from "lucide-react";

export type CompileStatus = "idle" | "compiling" | "success" | "error" | "retrying";

interface OutputPanelProps {
  status: CompileStatus;
  error: string | null;
  generatedFiles: string[];
  onCompile: () => void;
  hasCode: boolean;
  retryUsed: boolean;
}

export default function OutputPanel({
  status,
  error,
  generatedFiles,
  onCompile,
  hasCode,
  retryUsed,
}: OutputPanelProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "idle":
        return (
          <span className="status-badge status-badge--idle">
            <Terminal size={12} />
            Ready
          </span>
        );
      case "compiling":
        return (
          <span className="status-badge status-badge--loading">
            <Loader2 size={12} className="animate-spin-slow" />
            Compiling...
          </span>
        );
      case "retrying":
        return (
          <span className="status-badge status-badge--loading">
            <RotateCw size={12} className="animate-spin-slow" />
            Auto-fixing...
          </span>
        );
      case "success":
        return (
          <span className="status-badge status-badge--success">
            <CheckCircle2 size={12} />
            Success
          </span>
        );
      case "error":
        return (
          <span className="status-badge status-badge--error">
            <XCircle size={12} />
            Error
          </span>
        );
    }
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
        <Terminal size={14} style={{ color: "var(--accent-secondary)" }} />
        <span>Output</span>
        <div style={{ marginLeft: "auto" }}>{getStatusBadge()}</div>
      </div>

      <div
        className="panel-body"
        style={{
          flex: 1,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Compile button */}
        <button
          className="btn-primary"
          onClick={onCompile}
          disabled={!hasCode || status === "compiling" || status === "retrying"}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {status === "compiling" || status === "retrying" ? (
            <>
              <Loader2 size={16} className="animate-spin-slow" />
              {status === "retrying" ? "Auto-fixing & Retrying..." : "Compiling SKiDL..."}
            </>
          ) : (
            <>
              <PlayCircle size={16} />
              Compile to KiCad
            </>
          )}
        </button>

        {/* Retry indicator */}
        {retryUsed && status === "success" && (
          <div
            className="animate-fade-in"
            style={{
              padding: "10px 14px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              fontSize: "12px",
              color: "var(--accent-warning)",
            }}
          >
            <AlertTriangle size={14} />
            Code was auto-fixed during compilation
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="animate-fade-in">
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent-error)",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <XCircle size={14} />
              Compilation Error
            </div>
            <div className="error-log">{error}</div>
          </div>
        )}

        {/* Generated files */}
        {generatedFiles.length > 0 && (
          <div className="animate-fade-in">
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent-success)",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CheckCircle2 size={14} />
              Generated Files
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {generatedFiles.map((file, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <FileCode2 size={14} style={{ color: "var(--accent-secondary)" }} />
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Idle state */}
        {status === "idle" && !error && generatedFiles.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              textAlign: "center",
              gap: "12px",
            }}
          >
            <Terminal size={32} style={{ opacity: 0.3 }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500 }}>
                No compilation output yet
              </p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>
                Generate SKiDL code first, then compile to KiCad
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
