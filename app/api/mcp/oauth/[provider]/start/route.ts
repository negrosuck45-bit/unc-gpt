import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const OAUTH_CONFIG = {
  github: {
    clientId: "f61aadc0ab2a1d5a3b7d6940ff31438fb5a52132",
    clientSecret: "YOUR_GITHUB_CLIENT_SECRET_HERE", // <-- REPLACE THIS
    authUrl: "https://github.com/login/oauth/authorize",
    scopes: ["repo", "user"],
  },
  linear: {
    clientId: "f977b36deb20417ea5a13400c7fc7ed7",
    clientSecret: "YOUR_LINEAR_CLIENT_SECRET_HERE", // <-- REPLACE THIS
    authUrl: "https://linear.app/oauth/authorize",
    scopes: ["read", "write", "issues:create"],
  },
  slack: {
    clientId: "11100863267972.11095194503062",
    clientSecret: "YOUR_SLACK_CLIENT_SECRET_HERE", // <-- REPLACE THIS
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: ["chat:write", "channels:read", "channels:history", "users:read"],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  
  if (!providerParam) {
    return NextResponse.json({ error: "Provider parameter is required" }, { status: 400 });
  }
  
  const provider = providerParam.toLowerCase();
  const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];

  if (!config) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || "https://unc-gpt.vercel.app";
  const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;

  const state = randomBytes(32).toString("hex");

  const authUrl = buildAuthUrl(config, redirectUri, state, provider);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}

function buildAuthUrl(
  config: (typeof OAUTH_CONFIG)[keyof typeof OAUTH_CONFIG],
  redirectUri: string,
  state: string,
  provider: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
    response_type: "code",
  });

  if (provider === "slack") {
    params.set("user_scope", config.scopes.join(" "));
  }

  return `${config.authUrl}?${params.toString()}`;
}
