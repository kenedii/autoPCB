"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, LogIn, LogOut, ArrowRight, UserPlus, User, ChevronDown, Loader2 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const menuContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compileEmailEnabled, setCompileEmailEnabled] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Check auth state on mount and when pathname changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsAuthenticated(!!data.user);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCompileEmailEnabled(false);
      setMenuOpen(false);
      return;
    }

    const fetchSettings = async () => {
      setIsSettingsLoading(true);
      try {
        const res = await fetch("/api/auth/settings", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setCompileEmailEnabled(!!data?.settings?.compileEmailEnabled);
        }
      } catch {
        // Ignore transient fetch failures for navbar settings.
      } finally {
        setIsSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!menuContainerRef.current) return;
      const target = event.target as Node;
      if (!menuContainerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const handleCompileEmailToggle = async () => {
    if (isSavingSettings || isSettingsLoading) return;

    const nextValue = !compileEmailEnabled;
    setCompileEmailEnabled(nextValue);
    setIsSavingSettings(true);

    try {
      const res = await fetch("/api/auth/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compileEmailEnabled: nextValue }),
      });

      if (!res.ok) {
        setCompileEmailEnabled(!nextValue);
      }
    } catch {
      setCompileEmailEnabled(!nextValue);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Don't render the navbar inside the design workspace itself to save vertical space
  // OR render a simplified version. For now we render it everywhere to meet the requirement.

  return (
    <nav
      className="glass"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid var(--border-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderRadius: 0,
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textDecoration: "none",
        }}
        className="group"
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          className="group-hover:scale-105 group-hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
        >
          <Cpu size={18} color="white" />
        </div>
        <span
          className="gradient-text"
          style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          AutoPCB
        </span>
      </Link>

      {/* Nav Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link
          href="/pricing"
          style={{
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            marginRight: "8px"
          }}
          className="hover:text-white transition-colors"
        >
          Pricing
        </Link>
        {pathname !== "/design" && (
          <Link
            href="/design"
            className="btn-primary"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              boxShadow: "0 0 20px rgba(99,102,241,0.2)",
            }}
          >
            Design a PCB
            <ArrowRight size={14} />
          </Link>
        )}

        <div
          style={{
            width: "1px",
            height: "24px",
            background: "var(--border-primary)",
            margin: "0 4px",
          }}
        />

        {isAuthenticated === null ? (
          // Loading state
          <div style={{ width: 150, height: 36 }} />
        ) : isAuthenticated ? (
          <div ref={menuContainerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="btn-ghost"
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              aria-expanded={menuOpen}
              aria-label="Account settings"
            >
              <User size={14} />
              Account
              <ChevronDown size={14} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  minWidth: "300px",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "14px",
                  padding: "14px",
                  boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
                  zIndex: 120,
                  background: "var(--bg-primary)",
                  backdropFilter: "none",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                    Account Settings
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    Get a polished completion email with links back to your circuit workspace and generated design artifacts.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 12px",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "10px",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Email me when compile finishes
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Default is off. Useful for long compile runs.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompileEmailToggle}
                    disabled={isSettingsLoading || isSavingSettings}
                    aria-label="Toggle compile completion emails"
                    aria-pressed={compileEmailEnabled}
                    style={{
                      width: "46px",
                      height: "24px",
                      borderRadius: "999px",
                      border: "1px solid var(--border-primary)",
                      background: compileEmailEnabled ? "var(--accent-success)" : "var(--bg-tertiary)",
                      position: "relative",
                      cursor: isSettingsLoading || isSavingSettings ? "not-allowed" : "pointer",
                      opacity: isSettingsLoading || isSavingSettings ? 0.7 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: "2px",
                        left: compileEmailEnabled ? "24px" : "2px",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>

                <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {isSettingsLoading ? "Loading settings..." : isSavingSettings ? "Saving..." : "Saved to your account"}
                  </span>
                  {(isSettingsLoading || isSavingSettings) && <Loader2 size={13} className="animate-spin" color="var(--text-muted)" />}
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-ghost"
                  style={{ width: "100%", marginTop: "12px", justifyContent: "center" }}
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="btn-ghost"
              style={{
                textDecoration: "none",
                padding: "8px 16px",
              }}
            >
              <LogIn size={14} />
              Log In
            </Link>
            <Link
              href="/register"
              className="btn-primary"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
                textDecoration: "none",
                padding: "8px 16px",
              }}
            >
              <UserPlus size={14} />
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
