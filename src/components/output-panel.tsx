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
  Network,
  FileText,
  Cpu,
  List,
  FileImage,
} from "lucide-react";
import NetlistViewer from "@/components/netlist-viewer";
import ConnectionsViewer from "@/components/connections-viewer";

export type CompileStatus = "idle" | "compiling" | "success" | "error" | "retrying";

type ActiveTab = "files" | "netlist" | "connections" | "schematic" | "spice";

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
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("files");

  // Auto-select the best tab after a successful compile
  React.useEffect(() => {
    if (status === "success") {
      if (netlist) setActiveTab("netlist");
      else if (schematicSvg) setActiveTab("schematic");
      else setActiveTab("files");
    } else if (status === "idle") {
      setActiveTab("files");
    }
  }, [status, netlist, schematicSvg]);

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

  const hasOutput = generatedFiles.length > 0 || schematicSvg || netlist || spice || cir || status === "success";

  // Tab button helper
  const TabBtn = ({
    tab,
    label,
    icon,
    available,
  }: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
    available: boolean;
  }) =>
    available ? (
      <button
        onClick={() => setActiveTab(tab)}
        style={{
          background: "none",
          border: "none",
          borderBottom: activeTab === tab ? "2px solid var(--accent-secondary)" : "2px solid transparent",
          color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: activeTab === tab ? 600 : 400,
          cursor: "pointer",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          marginBottom: -1,
          transition: "color 0.15s",
        }}
      >
        {icon}
        {label}
      </button>
    ) : null;

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
          overflow: "hidden",
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

        {/* ── TABS ── */}
        {hasOutput && (
          <>
            <div
              style={{
                display: "flex",
                gap: "2px",
                borderBottom: "1px solid var(--border-color)",
                flexShrink: 0,
              }}
            >
              <TabBtn tab="files" label="Files" icon={<FileCode2 size={12} />} available={generatedFiles.length > 0} />
              <TabBtn tab="netlist" label="Netlist Graph" icon={<Network size={12} />} available={!!netlist} />
              <TabBtn tab="connections" label="Circuit Table" icon={<List size={12} />} available={!!netlist} />
              <TabBtn tab="schematic" label="Schematic" icon={<FileImage size={12} />} available={!!schematicSvg} />
              <TabBtn tab="spice" label="SPICE" icon={<FileText size={12} />} available={!!(spice || cir)} />
            </div>

            {/* FILES TAB */}
            {activeTab === "files" && generatedFiles.length > 0 && (
              <div className="animate-fade-in" style={{ overflowY: "auto" }}>
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
                            gap: "4px",
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

            {/* NETLIST GRAPH TAB */}
            {activeTab === "netlist" && netlist && (
              <div className="animate-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <NetlistViewer netlistXml={netlist} />
              </div>
            )}

            {/* CONNECTIONS TAB */}
            {activeTab === "connections" && netlist && (
              <div className="animate-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <ConnectionsViewer netlistXml={netlist} />
              </div>
            )}

            {/* SCHEMATIC SVG TAB */}
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
                    minHeight: "300px",
                  }}
                  dangerouslySetInnerHTML={{ __html: schematicSvg }}
                />
              </div>
            )}

            {/* SPICE TAB */}
            {activeTab === "spice" && (spice || cir) && (
              <div className="animate-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <pre
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    fontSize: 11,
                    fontFamily: "monospace",
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    padding: "12px",
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    minHeight: 200,
                    maxHeight: 400,
                  }}
                >
                  {spice || cir}
                </pre>
              </div>
            )}
          </>
        )}

        {/* Idle state */}
        {status === "idle" && !error && !hasOutput && (
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
