"use client";

import React, { useState } from "react";
import Header from "@/components/header";
import PromptPanel from "@/components/prompt-panel";
import CodePanel from "@/components/code-panel";
import OutputPanel, { CompileStatus } from "@/components/output-panel";

export default function DesignWorkspace() {
  const [model, setModel] = useState("gpt-4o");
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [retryUsed, setRetryUsed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Store compilation output for export
  const [kicadPcb, setKicadPcb] = useState("");
  const [kicadSch, setKicadSch] = useState("");
  const [netlist, setNetlist] = useState("");

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setCompileStatus("idle");
    setCompileError(null);
    setGeneratedFiles([]);
    setRetryUsed(false);

    try {
      setPromptHistory((prev) => [...prev, prompt]);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, existingCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setCode(data.skidlCode);
      } else {
        alert(data.error || "Generation failed.");
      }
    } catch (err) {
      alert("Failed to connect to the server.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompile = async () => {
    setCompileStatus("compiling");
    setCompileError(null);
    setGeneratedFiles([]);
    setRetryUsed(false);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skidlCode: code, model }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCompileStatus("success");
        setCompileError(null);
        setRetryUsed(data.retryUsed || false);
        if (data.fixedCode) setCode(data.fixedCode);

        const files = [];
        if (data.kicadPcb) {
          files.push("circuit.kicad_pcb");
          setKicadPcb(data.kicadPcb);
        }
        if (data.kicadSch) {
          files.push("circuit.kicad_sch");
          setKicadSch(data.kicadSch);
        }
        if (data.netlist) {
          files.push("circuit.net");
          setNetlist(data.netlist);
        }
        setGeneratedFiles(files);
      } else {
        setCompileStatus("error");
        setCompileError(data.error || "Compilation failed. Check SKiDL syntax.");
      }
    } catch (err) {
      setCompileStatus("error");
      setCompileError("Failed to communicate with compile server.");
    }
  };

  const handleExport = async () => {
    if (!code) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skidlCode: code, kicadPcb, kicadSch, netlist }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "autopcb-export.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Export failed.");
      }
    } catch (err) {
      alert("Failed to communicate with export server.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 65px)",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <Header
        model={model}
        onModelChange={setModel}
        onExport={handleExport}
        isExporting={isExporting}
        hasCode={!!code}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "16px",
          gap: "16px",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PromptPanel
            onSubmit={handleGenerate}
            isGenerating={isGenerating}
            hasExistingCode={!!code}
            promptHistory={promptHistory}
          />
        </div>
        <div style={{ flex: 2, minWidth: 0 }}>
          <CodePanel
            code={code}
            onCodeChange={setCode}
            isGenerating={isGenerating}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <OutputPanel
            status={compileStatus}
            error={compileError}
            generatedFiles={generatedFiles}
            onCompile={handleCompile}
            hasCode={!!code}
            retryUsed={retryUsed}
          />
        </div>
      </div>
    </div>
  );
}
