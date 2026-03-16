"use client";

import React from "react";
import Link from "next/link";
import { Cpu, Zap, Code2, Download, ArrowRight, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* Hero Background Gradient */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1200px",
          height: "800px",
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.05) 40%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px", position: "relative", zIndex: 10 }}>
        {/* Hero Section */}
        <section style={{ textAlign: "center", marginBottom: "100px" }}>
          <div
            className="animate-fade-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "999px",
              color: "var(--accent-primary-hover)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "32px",
            }}
          >
            <SparkleIcon />
            Introducing the first AI-native PCB editor
          </div>

          <h1
            className="animate-fade-in"
            style={{
              fontSize: "clamp(48px, 6vw, 72px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "24px",
              animationDelay: "0.1s",
              animationFillMode: "both",
            }}
          >
            Design electronic circuits <br />
            with <span className="gradient-text">plain English.</span>
          </h1>

          <p
            className="animate-fade-in"
            style={{
              fontSize: "clamp(18px, 2vw, 22px)",
              color: "var(--text-secondary)",
              maxWidth: "700px",
              margin: "0 auto 48px",
              lineHeight: 1.6,
              animationDelay: "0.2s",
              animationFillMode: "both",
            }}
          >
            Skip the tedious wiring. Just describe what you want to build, and AutoPCB automatically generates the SKiDL Python code and exports directly to KiCad.
          </p>

          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              animationDelay: "0.3s",
              animationFillMode: "both",
            }}
          >
            <Link
              href="/design"
              className="btn-primary"
              style={{ padding: "16px 32px", fontSize: "16px", borderRadius: "var(--radius-lg)" }}
            >
              Start Designing Free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              className="btn-ghost"
              style={{
                padding: "16px 32px",
                fontSize: "16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-elevated)",
              }}
            >
              Create Account
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "16px" }}>
              How It Works
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
              A seamless pipeline from thought to printed circuit board.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Feature 1 */}
            <div
              className="glass"
              style={{
                padding: "32px",
                borderRadius: "var(--radius-lg)",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  background: "rgba(6, 182, 212, 0.1)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Zap size={24} style={{ color: "var(--accent-secondary)" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
                1. AI Prompting
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Simply type your requirements like "Create a 555 timer astable circuit with an LED indicator". Our LLMs understand context and circuitry.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="glass"
              style={{
                padding: "32px",
                borderRadius: "var(--radius-lg)",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Code2 size={24} style={{ color: "var(--accent-primary)" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
                2. SKiDL Python Output
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                AutoPCB generates highly readable, standard SKiDL code. You can edit the code directly or ask the AI to modify the existing net connections.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="glass"
              style={{
                padding: "32px",
                borderRadius: "var(--radius-lg)",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Download size={24} style={{ color: "var(--accent-success)" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
                3. Compile to KiCad
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Click compile and we execute the Python code on our servers, returning battle-tested `.kicad_pcb` files ready for routing and manufacturing.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            marginTop: "100px",
            padding: "32px 0",
            borderTop: "1px solid var(--border-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu size={16} /> AutoPCB © {new Date().getFullYear()}
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            <Link href="/pricing" style={{ color: "inherit", textDecoration: "none" }}>
              Pricing
            </Link>
            <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
              About
            </Link>
            <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
              Terms & Privacy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
