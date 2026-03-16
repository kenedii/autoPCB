"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, LogIn, LogOut, ArrowRight, UserPlus } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    window.location.href = "/";
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
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ padding: "8px 16px" }}
          >
            <LogOut size={14} />
            Log Out
          </button>
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
