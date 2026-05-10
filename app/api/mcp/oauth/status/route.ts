import { NextRequest, NextResponse } from "next/server";

const PROVIDERS = ["github", "linear", "slack", "notion", "google_drive", "vercel"];

export async function GET(request: NextRequest) {
  const status: Record<string, { connected: boolean; configured: boolean }> = {};

  for (const provider of PROVIDERS) {
    const isConnected = !!request.cookies.get(`mcp_oauth_${provider}`)?.value;
    const isConfigured = !!process.env[`${provider.toUpperCase()}_CLIENT_ID`];

    status[provider] = {
      connected: isConnected,
      configured: isConfigured,
    };
  }

  return NextResponse.json(status);
}
