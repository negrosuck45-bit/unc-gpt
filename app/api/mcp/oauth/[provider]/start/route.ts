import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const OAUTH_CONFIG = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "f61aadc0ab2a1d3a3b7d6940ff31438fb5a52132",
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authUrl: "https://github.com/login/oauth/authorize",
    scopes: ["repo", "user"],
  },
  linear: {
    clientId: process.env.LINEAR_CLIENT_ID || "f977b36deb20417ea5a13400c7fc7ed7",
    clientSecret: process.env.LINEAR_CLIENT_SECRET || "af95b0553d0dc9c00f98f3e5f7d5194b",
    authUrl: "https://linear.app/oauth/authorize",
    scopes: ["read", "write", "issues:create"],
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "11100863267972.11095194503062",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "c6f76d0fda5d6dbcbbae722cf3da0e8c",
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: ["chat:write", "channels:read", "channels:history", "users:read"],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider.toLowerCase();
  const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];

  if (!config) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;

  // Generate CSRF token
  const state = randomBytes(32).toString("hex");

  // Store state in cookie (expires in 10 minutes)
  const response = NextResponse.redirect(
    buildAuthUrl(config, redirectUri, state, provider)
  );

  response.cookies.set(`oauth_${provider}_state`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
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
  });

  if (provider === "slack") {
    params.set("user_scope", config.scopes.join(" "));
  }

  return `${config.authUrl}?${params.toString()}`;
}
