import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRows = await db.$queryRaw<Array<{ compileEmailEnabled: boolean }>>`
      SELECT "compileEmailEnabled"
      FROM "User"
      WHERE "id" = ${session.userId}
      LIMIT 1
    `;
    const user = userRows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        compileEmailEnabled: user.compileEmailEnabled,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/settings][GET] Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { compileEmailEnabled } = body;

    if (typeof compileEmailEnabled !== "boolean") {
      return NextResponse.json(
        { error: "compileEmailEnabled must be a boolean" },
        { status: 400 }
      );
    }

    await db.$executeRaw`
      UPDATE "User"
      SET "compileEmailEnabled" = ${compileEmailEnabled}
      WHERE "id" = ${session.userId}
    `;

    return NextResponse.json({
      success: true,
      settings: {
        compileEmailEnabled,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/settings][PATCH] Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
