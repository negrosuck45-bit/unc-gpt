import { NextRequest, NextResponse } from "next/server";

type OAuthProvider = "github" | "linear" | "slack";

type CallbackConfig = {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
};

const TOKEN_URLS: Record<OAuthProvider, string> = {
  github: "https://github.com/login/oauth/access_token",
  linear: "https://api.linear.app/oauth/token",
  slack: "https://slack.com/api/oauth.v2.access",
};

function getCallbackConfig(provider: OAuthProvider): CallbackConfig | null {
  const envPrefix = provider.toUpperCase();
  const clientId = process.env[`${envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];
  const tokenUrl = TOKEN_URLS[provider];
  if (!clientId || !clientSecret || !tokenUrl) return null;
  return { clientId, clientSecret, tokenUrl };
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
  const config = getCallbackConfig(provider);
  if (!config) {
    return NextResponse.json(
      { error: "This connector is not configured yet." },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const storedState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (!state || state !== storedState) {
    return NextResponse.json({ error: "OAuth state validation failed" }, { status: 400 });
  }

  try {
    const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;
    let tokenResponse: Response;

    if (provider === "slack") {
      const formData = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
    } else if (provider === "linear") {
      const formData = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
    } else {
      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
    }

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "Token exchange failed" }, { status: 400 });
    }

    const accessToken = tokenData.access_token || tokenData.authed_user?.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "Provider did not return an access token" }, { status: 400 });
    }

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.set(`mcp_oauth_${provider}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.set(`mcp_oauth_${provider}_connected`, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.delete(`oauth_state_${provider}`);
    return response;
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
