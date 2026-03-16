import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
    },
  });
}
