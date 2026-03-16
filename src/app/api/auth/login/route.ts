import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as argon2 from "argon2";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password against hash
    const isValid = await argon2.verify(user.passwordHash, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session cookie
    await createSession({ userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/login] Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
