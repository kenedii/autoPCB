import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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

        <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "24px" }}>
          Terms of Service & Privacy Policy
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "48px" }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-invert" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {/* ----- TERMS OF SERVICE ----- */}
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px", marginTop: "32px", marginBottom: "16px" }}>
            Part 1: Terms of Service
          </h2>
          
          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            1. Acceptance of Terms
          </h3>
          <p style={{ marginBottom: "24px" }}>
            By accessing or using AutoPCB, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            2. Description of Service
          </h3>
          <p style={{ marginBottom: "24px" }}>
            AutoPCB provides an AI-powered interface for generating SKiDL Python code and compiling it into KiCad PCB layout files. The service is provided "as is" and intended for educational and prototyping purposes.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            3. Disclaimer of Liability for Physical Hardware
          </h3>
          <p style={{ marginBottom: "24px" }}>
            <strong>WARNING:</strong> AutoPCB generates circuit designs based on AI models which are prone to hallucinations or technical errors. 
            You are solely responsible for validating, testing, and verifying any generated circuit designs before manufacturing, fabricating, or applying power to them.
            AutoPCB and its creators shall not be held liable for any physical damage, fire, electrical hazard, hardware destruction, or personal injury resulting from the use of circuits designed through this service.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            4. User Accounts
          </h3>
          <p style={{ marginBottom: "24px" }}>
            When you create an account with us, you must provide accurate information. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            5. Intellectual Property
          </h3>
          <p style={{ marginBottom: "24px" }}>
            The circuits you design using AutoPCB belong to you. We claim no ownership over the KiCad files or Python scripts generated as a result of your prompts. The AutoPCB platform itself, including its original code, features, and functionality, is owned by the creators.
          </p>

          <hr style={{ borderColor: "var(--border-primary)", margin: "48px 0" }} />

          {/* ----- PRIVACY POLICY ----- */}
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px", marginTop: "32px", marginBottom: "16px" }}>
            Part 2: Privacy Policy
          </h2>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            1. Information We Collect
          </h3>
          <p style={{ marginBottom: "24px" }}>
            We collect the email address you provide during registration and the circuit design prompts you submit to our service. Your passwords are cryptographically hashed using Argon2id and cannot be read by us.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            2. How We Use Your Information
          </h3>
          <p style={{ marginBottom: "24px" }}>
            We use your prompts exclusively to generate SKiDL code via our AI providers (e.g., OpenAI). We do not sell your personal data to third parties. Your account identifier is stored in a secure, HTTP-only JWT cookie to maintain your active session.
          </p>

          <h3 style={{ color: "var(--text-primary)", fontSize: "20px", marginTop: "24px", marginBottom: "16px" }}>
            3. AI Provider Data Sharing
          </h3>
          <p style={{ marginBottom: "24px" }}>
            To provide the core functionality of AutoPCB, the text prompts and code snippets you submit are transmitted to third-party AI providers (such as OpenAI). By using the service, you consent to this data processing. Please do not submit confidential or sensitive proprietary information in your text prompts.
          </p>
        </div>
      </div>
    </div>
  );
}
