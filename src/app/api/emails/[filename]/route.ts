import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  try {
    // Basic security check: only allow .html files from the emails directory
    if (!filename.endsWith(".html") || filename.includes("..")) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "emails", filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Email not found", { status: 404 });
    }

    const html = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
