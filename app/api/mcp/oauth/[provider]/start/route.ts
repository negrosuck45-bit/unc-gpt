import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

type OAuthProvider = "github" | "linear" | "slack";

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  scopes: string[];
};

const PROVIDER_CONFIG: Record<OAuthProvider, Omit<OAuthConfig, "clientId" | "clientSecret">> = {
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    scopes: ["repo", "user"],
  },
  linear: {
    authUrl: "https://linear.app/oauth/authorize",
    scopes: ["read", "write", "issues:create"],
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: ["chat:write", "channels:read", "channels:history", "users:read"],
  },
};

function getOAuthConfig(provider: OAuthProvider): OAuthConfig | null {
  const base = PROVIDER_CONFIG[provider];
  if (!base) return null;

  const envPrefix = provider.toUpperCase();
  const clientId = process.env[`${envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;

  return { ...base, clientId, clientSecret };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  if (!providerParam) {
    return NextResponse.json({ error: "Provider parameter is required" }, { status: 400 });
  }

  const provider = providerParam.toLowerCase() as OAuthProvider;
  const config = getOAuthConfig(provider);
  if (!config) {
    return NextResponse.json(
      { error: "This connector is not configured yet. Add its server-side OAuth credentials first." },
      { status: 503 }
    );
  }

  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;
  const state = randomBytes(32).toString("hex");
  const authUrl = buildAuthUrl(config, redirectUri, state, provider);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

function buildAuthUrl(
  config: OAuthConfig,
  redirectUri: string,
  state: string,
  provider: OAuthProvider
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
