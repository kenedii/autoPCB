"use client";

import React, { useState } from "react";
import { Cpu, ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = "/design";
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "80%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "800px",
          background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "40px",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 16px rgba(6, 182, 212, 0.25)",
            }}
          >
            <Cpu size={24} color="white" />
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>
            Create Account
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            Start designing AI-powered PCBs
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "var(--radius-sm)",
              color: "var(--accent-error)",
              fontSize: "13px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="prompt-input"
                style={{ paddingLeft: "40px", height: "44px" }}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="prompt-input"
                style={{ paddingLeft: "40px", height: "44px" }}
                placeholder="Min 8 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{
              width: "100%",
              height: "44px",
              justifyContent: "center",
              marginTop: "8px",
              fontSize: "15px",
            }}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin-slow" />
            ) : (
              <>
                Sign Up
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px" }}>
          <span style={{ color: "var(--text-muted)" }}>Already have an account? </span>
          <Link
            href="/login"
            style={{
              color: "var(--accent-secondary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </div>
        
        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
          By signing up, you agree to our <Link href="/terms" style={{ textDecoration: "underline" }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
