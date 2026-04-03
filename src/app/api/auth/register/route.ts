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
    /* try {
      const templatePath = path.join(process.cwd(), "src/utils/emailtemplates/welcome.html");
      console.log(`[Email] Attempting to send welcome email to ${email}`);
      console.log(`[Email] Template path: ${templatePath}`);
      
      if (!fs.existsSync(templatePath)) {
        console.error(`[Email] Template NOT FOUND at ${templatePath}`);
      } else {
        let html = fs.readFileSync(templatePath, "utf-8");
        
        // Basic placeholder replacement
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
        html = html.replace(/{{email}}/g, email).replace(/{{appUrl}}/g, appUrl);

        // Force email to the verified Resend account owner (christopherkenedi04@gmail.com)
        // so that the user actually receives a real email during testing.
        const deliveryEmail = "christopherkenedi04@gmail.com";
        console.log(`[Email] Sending via Resend to verified owner: ${deliveryEmail} (originally meant for: ${email})`);
        
        const { data, error: resendError } = await resend.emails.send({
          from: "AutoPCB <onboarding@resend.dev>",
          to: deliveryEmail,
          subject: `Welcome to AutoPCB! (Sent on behalf of ${email})`,
          html: html,
        });

        if (resendError) {
          console.error("[Email] Resend Error:", JSON.stringify(resendError, null, 2));
          
          // Sandbox Fallback: If 403 Forbidden (restricted testing recipient)
          if ((resendError as any).statusCode === 403) {
            const sandboxPath = path.join(process.cwd(), "public", "emails");
            if (!fs.existsSync(sandboxPath)) {
              fs.mkdirSync(sandboxPath, { recursive: true });
            }
            const fileName = `welcome-${email.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
            const filePath = path.join(sandboxPath, fileName);
            fs.writeFileSync(filePath, html);
            console.log(`[Email] Sandbox Fallback activated. Email saved to: ${filePath}`);
            console.log(`[Email] ACCESS VIA: http://localhost:3001/api/emails/${fileName}`);
          }
        } else {
          console.log("[Email] Sent successfully. ID:", data?.id);
        }
      }
    } catch (emailError: any) {
      console.error("[Email] Unexpected error:", emailError);
      
      // Secondary fallback for any other error
      try {
        const sandboxPath = path.join(process.cwd(), "public", "emails");
        if (!fs.existsSync(sandboxPath)) fs.mkdirSync(sandboxPath, { recursive: true });
        const fileName = `error-fallback-${email.replace(/[^a-zA-Z0-0]/g, "_")}.html`;
        fs.writeFileSync(path.join(sandboxPath, fileName), "Registration succeeded but email failed. Check logs.");
      } catch (e) {}
    } */

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
