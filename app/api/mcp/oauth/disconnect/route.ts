import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { provider } = await request.json();

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const response = NextResponse.json({
    success: true,
    message: `Disconnected from ${provider}`,
  });

  // Clear both cookies
  response.cookies.delete(`mcp_oauth_${provider}`);
  response.cookies.delete(`mcp_oauth_${provider}_connected`);

  return response;
}
