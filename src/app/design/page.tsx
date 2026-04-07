"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import Header from "@/components/header";
import PromptPanel from "@/components/prompt-panel";
import CodePanel from "@/components/code-panel";
import OutputPanel, { CompileStatus } from "@/components/output-panel";

type PanelKey = "chat" | "code" | "output";

type PaneSizes = {
  chat: number;
  code: number;
  output: number;
};

const MIN = {
  chat: 16,
  code: 28,
  output: 16,
};

export default function DesignWorkspace() {
  const [model, setModel] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [code, setCode] = useState("from skidl import *");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentResponsesEnabled, setAgentResponsesEnabled] = useState(true);
  const [paneSizes, setPaneSizes] = useState<PaneSizes>({ chat: 24, code: 46, output: 30 });
  const [activeFullscreen, setActiveFullscreen] = useState<PanelKey | null>(null);
  const [dragHandle, setDragHandle] = useState<"left" | "right" | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; sizes: PaneSizes } | null>(null);

  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [retryUsed, setRetryUsed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Store compilation output for export
  const [kicadPcb, setKicadPcb] = useState("");
  const [kicadSch, setKicadSch] = useState("");
  const [netlist, setNetlist] = useState("");
  const [spice, setSpice] = useState("");
  const [schematicSvg, setSchematicSvg] = useState("");
  const [cir, setCir] = useState("");
  const [lib, setLib] = useState("");
  const [gerberZip, setGerberZip] = useState("");
  const [drillZip, setDrillZip] = useState("");
  const [stepData, setStepData] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("design:paneSizes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PaneSizes;
        if (parsed.chat && parsed.code && parsed.output) {
          setPaneSizes(parsed);
        }
      } catch {
        // Ignore invalid local storage values.
      }
    }

    const savedReplies = window.localStorage.getItem("design:agentReplies");
    if (savedReplies === "0") {
      setAgentResponsesEnabled(false);
    }

    const checkNarrow = () => setIsNarrow(window.innerWidth < 1180);
    checkNarrow();
    window.addEventListener("resize", checkNarrow);
    return () => window.removeEventListener("resize", checkNarrow);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("design:paneSizes", JSON.stringify(paneSizes));
  }, [paneSizes]);

  useEffect(() => {
    window.localStorage.setItem("design:agentReplies", agentResponsesEnabled ? "1" : "0");
  }, [agentResponsesEnabled]);

  useEffect(() => {
    if (!dragHandle) return;

    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      const container = containerRef.current;
      if (!start || !container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width) return;

      const deltaPct = ((e.clientX - start.x) / rect.width) * 100;

      if (dragHandle === "left") {
        let chat = start.sizes.chat + deltaPct;
        let code = start.sizes.code - deltaPct;

        if (chat < MIN.chat) {
          code -= MIN.chat - chat;
          chat = MIN.chat;
        }
        if (code < MIN.code) {
          chat -= MIN.code - code;
          code = MIN.code;
        }

        setPaneSizes({ chat, code, output: start.sizes.output });
      } else {
        let code = start.sizes.code + deltaPct;
        let output = start.sizes.output - deltaPct;

        if (output < MIN.output) {
          code -= MIN.output - output;
          output = MIN.output;
        }
        if (code < MIN.code) {
          output -= MIN.code - code;
          code = MIN.code;
        }

        setPaneSizes({ chat: start.sizes.chat, code, output });
      }
    };

    const onUp = () => {
      setDragHandle(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragHandle]);

  const handleGenerate = async (prompt: string) => {
    setPromptHistory((prev) => [...prev, prompt]);

    if (!agentResponsesEnabled) {
      return;
    }

    setIsGenerating(true);
    setCompileStatus("idle");
    setCompileError(null);
    setGeneratedFiles([]);
    setSchematicSvg("");
    setSpice("");
    setCir("");
    setLib("");
    setGerberZip("");
    setDrillZip("");
    setStepData("");
    setRetryUsed(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, existingCode: code, apiKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setCode(data.skidlCode);
      } else {
        alert(data.error || "Generation failed.");
      }
    } catch {
      alert("Failed to connect to the server.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompile = async () => {
    setCompileStatus("compiling");
    setCompileError(null);
    setGeneratedFiles([]);
    setSchematicSvg("");
    setSpice("");
    setCir("");
    setLib("");
    setGerberZip("");
    setDrillZip("");
    setStepData("");
    setRetryUsed(false);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skidlCode: code, model, apiKey }),
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
        if (data.spice) {
          files.push("circuit.spice");
          setSpice(data.spice);
        }
        if (data.cir) {
          files.push("circuit.cir");
          setCir(data.cir);
        }
        if (data.lib) {
          files.push("circuit.lib");
          setLib(data.lib);
        }
        if (data.gerberZipBase64) {
          files.push("gerbers.gbr.zip");
          setGerberZip(data.gerberZipBase64);
        }
        if (data.drillZipBase64) {
          files.push("drills.drl.zip");
          setDrillZip(data.drillZipBase64);
        }
        if (data.stepBase64) {
          files.push("circuit.step");
          setStepData(data.stepBase64);
        }
        if (data.schematicSvg) {
          setSchematicSvg(data.schematicSvg);
        }
        setGeneratedFiles(files);
      } else {
        setCompileStatus("error");
        setCompileError(data.error || "Compilation failed. Check SKiDL syntax.");
      }
    } catch {
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
        body: JSON.stringify({
          skidlCode: code,
          kicadPcb,
          kicadSch,
          netlist,
          spice,
          cir,
          lib,
          schematicSvg,
          gerberZipBase64: gerberZip,
          drillZipBase64: drillZip,
          stepBase64: stepData,
        }),
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
    } catch {
      alert("Failed to communicate with export server.");
    } finally {
      setIsExporting(false);
    }
  };

  const panelControlButton = (panel: PanelKey) => (
    <button
      className="btn-ghost"
      onClick={() =>
        setActiveFullscreen((prev) => {
          if (prev === panel) return null;
          return panel;
        })
      }
      title={activeFullscreen === panel ? "Exit fullscreen" : "Fullscreen panel"}
      style={{ marginLeft: "auto", padding: "4px 8px", fontSize: "11px" }}
    >
      {activeFullscreen === panel ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
    </button>
  );

  const startResize = (handle: "left" | "right", e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, sizes: paneSizes };
    setDragHandle(handle);
  };

  const renderChatPanel = () => (
    <PromptPanel
      onSubmit={handleGenerate}
      isGenerating={isGenerating}
      hasExistingCode={!!code}
      promptHistory={promptHistory}
      headerActions={panelControlButton("chat")}
    />
  );

  const renderCodePanel = () => (
    <CodePanel
      code={code}
      onCodeChange={setCode}
      isGenerating={isGenerating}
      headerActions={panelControlButton("code")}
    />
  );

  const renderOutputPanel = () => (
    <OutputPanel
      status={compileStatus}
      error={compileError}
      generatedFiles={generatedFiles}
      schematicSvg={schematicSvg}
      spice={spice}
      kicadPcb={kicadPcb}
      netlist={netlist}
      kicadSch={kicadSch}
      cir={cir}
      lib={lib}
      gerberZip={gerberZip}
      drillZip={drillZip}
      stepData={stepData}
      onCompile={handleCompile}
      hasCode={!!code}
      retryUsed={retryUsed}
      headerActions={panelControlButton("output")}
    />
  );

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
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onExport={handleExport}
        isExporting={isExporting}
        hasCode={!!code}
        agentResponsesEnabled={agentResponsesEnabled}
        onAgentResponsesToggle={setAgentResponsesEnabled}
      />
      <div
        ref={containerRef}
        style={{
          display: isNarrow ? "grid" : "flex",
          flex: 1,
          padding: "16px",
          gap: "16px",
          overflow: "hidden",
          gridTemplateRows: isNarrow ? "minmax(260px, 1fr) minmax(280px, 1.2fr) minmax(260px, 1fr)" : undefined,
        }}
      >
        {activeFullscreen === "chat" && <div style={{ flex: 1, minWidth: 0 }}>{renderChatPanel()}</div>}
        {activeFullscreen === "code" && <div style={{ flex: 1, minWidth: 0 }}>{renderCodePanel()}</div>}
        {activeFullscreen === "output" && <div style={{ flex: 1, minWidth: 0 }}>{renderOutputPanel()}</div>}

        {!activeFullscreen && !isNarrow && (
          <>
            <div style={{ width: `${paneSizes.chat}%`, minWidth: 0 }}>{renderChatPanel()}</div>
            <div
              onMouseDown={(e) => startResize("left", e)}
              style={{
                width: 6,
                cursor: "col-resize",
                background: "var(--border-primary)",
                borderRadius: 999,
                alignSelf: "stretch",
              }}
            />
            <div style={{ width: `${paneSizes.code}%`, minWidth: 0 }}>{renderCodePanel()}</div>
            <div
              onMouseDown={(e) => startResize("right", e)}
              style={{
                width: 6,
                cursor: "col-resize",
                background: "var(--border-primary)",
                borderRadius: 999,
                alignSelf: "stretch",
              }}
            />
            <div style={{ width: `${paneSizes.output}%`, minWidth: 0 }}>{renderOutputPanel()}</div>
          </>
        )}

        {!activeFullscreen && isNarrow && (
          <>
            <div style={{ minWidth: 0, minHeight: 0 }}>{renderChatPanel()}</div>
            <div style={{ minWidth: 0, minHeight: 0 }}>{renderCodePanel()}</div>
            <div style={{ minWidth: 0, minHeight: 0 }}>{renderOutputPanel()}</div>
          </>
        )}
      </div>
    </div>
  );
}
