import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as argon2 from "argon2";
import { createSession } from "@/lib/auth";

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

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

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
