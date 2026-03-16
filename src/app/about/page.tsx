import React from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Code2, Layers } from "lucide-react";

export default function AboutPage() {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link
          href="/"
          className="btn-ghost"
          style={{
            display: "inline-flex",
            marginBottom: "32px",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 style={{ fontSize: "40px", fontWeight: 800, marginBottom: "16px", letterSpacing: "-0.02em" }}>
          About <span className="gradient-text">AutoPCB</span>
        </h1>
        <p style={{ fontSize: "18px", color: "var(--text-secondary)", marginBottom: "48px", lineHeight: 1.6 }}>
          Bridging the gap between software prompt engineering and physical hardware design.
        </p>

        <div style={{ display: "grid", gap: "32px", marginBottom: "64px" }}>
          <div className="glass" style={{ padding: "32px", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "8px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", color: "var(--accent-primary)" }}>
                <Cpu size={20} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>The Mission</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Hardware layout is traditionally incredibly tedious and gatekept by difficult-to-learn graphical interfaces. 
              Our mission is to enable engineers and hobbyists to design printed circuit boards (PCBs) entirely through code 
              and natural language. If you can describe a circuit, AutoPCB can help you build it.
            </p>
          </div>

          <div className="glass" style={{ padding: "32px", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "var(--accent-success)" }}>
                <Code2 size={20} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>The SKiDL Advantage</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Under the hood, AutoPCB is heavily reliant on <strong>SKiDL</strong>. By generating SKiDL Python code rather than placing wires on a graphical schematic, your circuits become version-controllable, modular, and programmable. Modern LLMs are uniquely skilled at writing code, making SKiDL the perfect bridge for AI-generated hardware.
            </p>
          </div>

          <div className="glass" style={{ padding: "32px", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "8px", background: "rgba(6, 182, 212, 0.1)", borderRadius: "8px", color: "var(--accent-secondary)" }}>
                <Layers size={20} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Powered by KiCad</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              We don't try to lock you into a proprietary ecosystem. AutoPCB executes the Python on our backend and directly outputs standard `.kicad_pcb` layout files. You download a standard ZIP and take it straight to your favorite open-source routing tools.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", paddingTop: "32px", borderTop: "1px solid var(--border-primary)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Built with Next.js, Shadcn UI, OpenAI, and SKiDL.
          </p>
        </div>
      </div>
    </div>
  );
}
