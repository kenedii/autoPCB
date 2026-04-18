import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as argon2 from "argon2";
import { createSession } from "@/lib/auth";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid email or password (min 8 chars)" },
        { status: 400 }
      );
    }

    console.log(`[/api/auth/register] Checking if user exists: ${email}`);
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`[/api/auth/register] User ALREADY EXISTS: ${JSON.stringify(existingUser)}`);
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }
    console.log(`[/api/auth/register] User does not exist, proceeding with registration for: ${email}`);

    // Hash password with argon2id (the modern standard)
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    const userId = crypto.randomUUID();

    // Insert user
    await db.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
      },
    });

    // Create session cookie
    await createSession({ userId, email });

    // Send welcome email
    try {
      console.log(`[Email] Starting send process to: ${email}`);
      const templatePath = path.join(process.cwd(), "src/utils/emailtemplates/welcome.html");
      console.log(`[Email] Template path: ${templatePath}`);
      
      if (fs.existsSync(templatePath)) {
        let html = fs.readFileSync(templatePath, "utf-8");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        html = html.replace(/{{email}}/g, email).replace(/{{appUrl}}/g, appUrl);

        console.log(`[Email] Resend API Key present: ${!!process.env.RESEND_API_KEY}`);
        const forcedRecipient = process.env.RESEND_TEST_EMAIL?.trim();
        const recipient = forcedRecipient || email;
        if (forcedRecipient) {
          html = `<p><strong>Original signup email:</strong> ${email}</p>${html}`;
          console.log(`[Email] RESEND_TEST_EMAIL enabled, sending to sandbox recipient: ${recipient}`);
        }
        
        const { data, error: resendError } = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: recipient,
          subject: "Welcome to AutoPCB!",
          html: html,
        });

        if (resendError) {
          console.error("[Email] Resend Error details:", JSON.stringify(resendError, null, 2));
          
          // Sandbox Fallback: If 403 Forbidden or other Resend failure
          const sandboxPath = path.join(process.cwd(), "public/emails");
          if (!fs.existsSync(sandboxPath)) {
            fs.mkdirSync(sandboxPath, { recursive: true });
          }
          const fileName = `welcome-${email.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
          const filePath = path.join(sandboxPath, fileName);
          fs.writeFileSync(filePath, html);
          console.log(`[Email] Fallback: Email saved to public/emails/${fileName}`);
        } else {
          console.log("[Email] Sent successfully via Resend. ID:", data?.id);
        }
      } else {
        console.error(`[Email] Template NOT FOUND at ${templatePath}`);
      }
    } catch (emailError: any) {
      console.error("[Email] Unexpected error:", emailError.message);
      console.error("[Email] Stack trace:", emailError.stack);
      
      // Secondary fallback for any other error
      try {
        const sandboxPath = path.join(process.cwd(), "public", "emails");
        if (!fs.existsSync(sandboxPath)) fs.mkdirSync(sandboxPath, { recursive: true });
        const fileName = `error-fallback-${email.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
        fs.writeFileSync(path.join(sandboxPath, fileName), "Registration succeeded but email failed. Check logs.");
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/register] Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
