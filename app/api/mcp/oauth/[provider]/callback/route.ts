import { NextRequest, NextResponse } from "next/server";

const OAUTH_CONFIG = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "f61aadc0ab2a1d3a3b7d6940ff31438fb5a52132",
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    tokenUrl: "https://github.com/login/oauth/access_token",
  },
  linear: {
    clientId: process.env.LINEAR_CLIENT_ID || "f977b36deb20417ea5a13400c7fc7ed7",
    clientSecret: process.env.LINEAR_CLIENT_SECRET || "af95b0553d0dc9c00f98f3e5f7d5194b",
    tokenUrl: "https://api.linear.app/oauth/token",
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "11100863267972.11095194503062",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "c6f76d0fda5d6dbcbbae722cf3da0e8c",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
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

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Check for OAuth errors
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // Verify CSRF token
  const storedState = request.cookies.get(`oauth_${provider}_state`)?.value;
  if (!state || state !== storedState) {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;

    // Exchange code for token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token && !tokenData.token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token || tokenData.token;

    // Create response that redirects back to app
    const response = NextResponse.redirect(`${baseUrl}/`);

    // Store token in httpOnly cookie
    response.cookies.set(`mcp_oauth_${provider}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Store connection status in non-httpOnly cookie (for UI)
    response.cookies.set(`mcp_oauth_${provider}_connected`, "1", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    // Clear state cookie
    response.cookies.delete(`oauth_${provider}_state`);

    return response;
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
