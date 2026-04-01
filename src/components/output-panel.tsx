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
  Download,
} from "lucide-react";

export type CompileStatus = "idle" | "compiling" | "success" | "error" | "retrying";

interface OutputPanelProps {
  status: CompileStatus;
  error: string | null;
  generatedFiles: string[];
  onCompile: () => void;
  hasCode: boolean;
  retryUsed: boolean;
  schematicSvg?: string;
  spice?: string;
  kicadPcb?: string;
  netlist?: string;
  kicadSch?: string;
  cir?: string;
  lib?: string;
  gerberZip?: string;
  drillZip?: string;
  stepData?: string;
}

export default function OutputPanel({
  status,
  error,
  generatedFiles,
  onCompile,
  hasCode,
  retryUsed,
  schematicSvg,
  spice,
  kicadPcb,
  netlist,
  kicadSch,
  cir,
  lib,
  gerberZip,
  drillZip,
  stepData,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"files" | "schematic" | "simulator">("files");

  const handleDownload = (filename: string, content?: string, isBase64?: boolean) => {
    if (!content) return;
    let url;
    if (isBase64) {
      const byteCharacters = atob(content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/octet-stream" });
      url = window.URL.createObjectURL(blob);
    } else {
      const blob = new Blob([content], { type: "text/plain" });
      url = window.URL.createObjectURL(blob);
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

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

        {/* Tabs for files / schematic / simulator */}
        {(generatedFiles.length > 0 || schematicSvg || status === "success") && (
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", marginTop: "8px" }}>
            <button
              onClick={() => setActiveTab("files")}
              style={{
                background: "none",
                border: "none",
                color: activeTab === "files" ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: activeTab === "files" ? 600 : 400,
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              Files
            </button>
            {schematicSvg && (
              <button
                onClick={() => setActiveTab("schematic")}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === "schematic" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: activeTab === "schematic" ? 600 : 400,
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                Schematic
              </button>
            )}
            <button
              onClick={() => setActiveTab("simulator")}
              style={{
                background: "none",
                border: "none",
                color: activeTab === "simulator" ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: activeTab === "simulator" ? 600 : 400,
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              Simulator/Editor
            </button>
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === "files" && generatedFiles.length > 0 && (
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
              {generatedFiles.map((file, i) => {
                let content = "";
                let isBase64 = false;
                if (file.endsWith(".kicad_pcb")) content = kicadPcb || "";
                else if (file.endsWith(".kicad_sch")) content = kicadSch || "";
                else if (file.endsWith(".net")) content = netlist || "";
                else if (file.endsWith(".spice")) content = spice || "";
                else if (file.endsWith(".cir")) content = cir || "";
                else if (file.endsWith(".lib")) content = lib || "";
                else if (file.endsWith(".gbr.zip")) { content = gerberZip || ""; isBase64 = true; }
                else if (file.endsWith(".drl.zip")) { content = drillZip || ""; isBase64 = true; }
                else if (file.endsWith(".step")) { content = stepData || ""; isBase64 = true; }

                return (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      background: "var(--bg-tertiary)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileCode2 size={14} style={{ color: "var(--accent-secondary)" }} />
                      {file}
                    </div>
                    <button
                      onClick={() => handleDownload(file, content, isBase64)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-secondary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title="Download file"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "schematic" && schematicSvg && (
          <div className="animate-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                background: "white", 
                borderRadius: "var(--radius-sm)",
                overflow: "auto",
                padding: "8px",
                border: "1px solid var(--border-color)",
                minHeight: "300px" // give it some room
              }}
              dangerouslySetInnerHTML={{ __html: schematicSvg }}
            />
          </div>
        )}

        {activeTab === "simulator" && (
           <div className="animate-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
             <iframe 
               src={spice ? `https://www.falstad.com/circuit/circuitjs.html?txt=${encodeURIComponent(spice)}` : "https://www.falstad.com/circuit/circuitjs.html?blank=1"}
               style={{ width: "100%", height: "100%", minHeight: "400px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
               title="Circuit Simulator and Editor"
             />
             <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", textAlign: "center" }}>
               Built-in SPICE simulator & interactive editor. You can import your downloaded .spice file (File &gt; Import).
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
