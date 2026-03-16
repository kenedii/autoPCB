"use client";

import React from "react";
import Link from "next/link";
import { Check, Cpu, Zap, Star } from "lucide-react";

export default function PricingPage() {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "80px 24px",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* Background Gradient */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1000px",
          height: "600px",
          background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, rgba(6,182,212,0.05) 40%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 800, marginBottom: "16px", letterSpacing: "-0.02em" }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: "18px", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Start designing AI-generated PCBs for free, then upgrade as your needs grow.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "stretch",
          }}
        >
          {/* Free Tier */}
          <div
            className="glass"
            style={{
              padding: "40px",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Free</h2>
              <div style={{ fontSize: "36px", fontWeight: 800 }}>$0<span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
              <p style={{ color: "var(--text-secondary)", marginTop: "12px", fontSize: "14px" }}>Perfect for hobbyists and students.</p>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Storage for up to 5 PCBs
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> 50 AI generations per month
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Access to standard models
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Community support
              </li>
            </ul>

            <Link href="/register" className="btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}>
              Get Started Free
            </Link>
          </div>

          {/* Plus Tier */}
          <div
            className="glow-border"
            style={{
              padding: "40px",
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-elevated)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              transform: "scale(1.05)",
              zIndex: 1,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--accent-primary)",
                color: "white",
                padding: "4px 12px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Zap size={14} /> Most Popular
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Plus</h2>
              <div style={{ fontSize: "36px", fontWeight: 800 }}>$15<span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
              <p style={{ color: "var(--text-secondary)", marginTop: "12px", fontSize: "14px" }}>For dedicated makers and engineers.</p>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} /> Storage for up to 50 PCBs
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} /> 500 AI generations per month
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} /> Access to premium models (GPT-4)
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} /> Priority email support
              </li>
            </ul>

            <Link href="/register" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "15px", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)" }}>
              Subscribe to Plus
            </Link>
          </div>

          {/* Pro Tier */}
          <div
            className="glass"
            style={{
              padding: "40px",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Pro</h2>
              <div style={{ fontSize: "36px", fontWeight: 800 }}>$49<span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
              <p style={{ color: "var(--text-secondary)", marginTop: "12px", fontSize: "14px" }}>For professional teams and businesses.</p>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Unlimited PCB storage
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Unlimited AI generations
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> Team collaboration & sharing
              </li>
              <li style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "15px" }}>
                <Check size={18} style={{ color: "var(--accent-success)", flexShrink: 0 }} /> 24/7 dedicated support
              </li>
            </ul>

            <Link href="/register" className="btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}>
              Subscribe to Pro
            </Link>
          </div>
        </div>

        <div style={{ marginTop: "64px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            * AI Generation tokens are consumed based on model complexity. Free tier includes roughly $2.00 worth of OpenAI credits per month.
          </p>
        </div>
      </div>
    </div>
  );
}
