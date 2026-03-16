"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  MessageSquarePlus,
  Clock,
  Edit3,
} from "lucide-react";

interface PromptPanelProps {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  hasExistingCode: boolean;
  promptHistory: string[];
}

export default function PromptPanel({
  onSubmit,
  isGenerating,
  hasExistingCode,
  promptHistory,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    onSubmit(prompt.trim());
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
      {/* Panel Header */}
      <div className="panel-header">
        <Sparkles size={14} style={{ color: "var(--accent-primary)" }} />
        <span>Design Prompt</span>
        {hasExistingCode && (
          <span
            className="status-badge status-badge--loading"
            style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 8px" }}
          >
            <Edit3 size={10} />
            Edit Mode
          </span>
        )}
      </div>

      {/* Prompt History */}
      <div
        className="panel-body"
        style={{
          flex: 1,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          overflowY: "auto",
        }}
      >
        {promptHistory.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquarePlus size={24} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Describe your circuit
              </p>
              <p style={{ fontSize: "12px", lineHeight: 1.5 }}>
                e.g. &ldquo;Create an LED driver circuit with 3 LEDs in parallel, each with its own current-limiting resistor&rdquo;
              </p>
            </div>

            {/* Example prompts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
              {[
                "Simple LED with resistor on 5V",
                "Arduino Nano breakout board",
                "555 timer astable circuit",
              ].map((example, i) => (
                <button
                  key={i}
                  className="btn-ghost"
                  onClick={() => setPrompt(example)}
                  style={{
                    textAlign: "left",
                    fontSize: "12px",
                    padding: "8px 12px",
                    justifyContent: "flex-start",
                    width: "100%",
                  }}
                >
                  <Sparkles size={12} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          promptHistory.map((p, i) => (
            <div
              key={i}
              className="animate-fade-in"
              style={{
                padding: "10px 14px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <Clock size={12} style={{ marginTop: "3px", flexShrink: 0, color: "var(--text-muted)" }} />
              <span>{p}</span>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid var(--border-primary)",
          display: "flex",
          gap: "8px",
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={textareaRef}
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasExistingCode
              ? "Describe what to modify..."
              : "Describe your circuit design..."
          }
          rows={1}
          style={{ flex: 1 }}
          disabled={isGenerating}
        />
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!prompt.trim() || isGenerating}
          style={{ padding: "10px 14px", flexShrink: 0 }}
        >
          {isGenerating ? (
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
