import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messageId, reason, type } = await req.json();

    if (!messageId || !reason || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Store feedback in a simple in-memory store or database
    // For now, we'll just return success
    // In production, you'd save this to a database

    return NextResponse.json(
      {
        success: true,
        feedbackId: `fb_${Date.now()}`,
        message: "Feedback received",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
