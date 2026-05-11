import { NextRequest, NextResponse } from "next/server";

const OAUTH_CONFIG = {
  github: {
    clientId: "f61aadc0ab2a1d5a3b7d6940ff31438fb5a52132",
    clientSecret: "0dcd3af55fcccaa7cd50a0d6a03bbd1d5aa19cd3",
    tokenUrl: "https://github.com/login/oauth/access_token",
  },
  linear: {
    clientId: "f977b36deb20417ea5a13400c7fc7ed7",
    clientSecret: "af95b0553d0dc9c00f98f3e5f7d5194b",
    tokenUrl: "https://api.linear.app/oauth/token",
  },
  slack: {
    clientId: "11100863267972.11095194503062",
    clientSecret: "c6f76d0fda5d6dbcbbae722cf3da0e8c",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
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

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  
  if (!state || state !== storedState) {
    return NextResponse.json({ 
      error: "State mismatch",
      debug: {
        hasState: !!state,
        hasStoredState: !!storedState,
        statesMatch: state === storedState,
      }
    }, { status: 400 });
  }

  try {
    const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || "https://unc-gpt.vercel.app";
    const redirectUri = `${baseUrl}/api/mcp/oauth/${provider}/callback`;

    let tokenResponse;
    let tokenData;

    if (provider === "slack") {
      const formData = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
    } else if (provider === "linear") {
      // Linear requires form-encoded with grant_type
      const formData = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
    } else {
      // GitHub — JSON with Accept header
      tokenResponse = await fetch(config.tokenUrl, {
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
    }

    tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "Token exchange failed", details: tokenData },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token || tokenData.authed_user?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to get access token", details: tokenData },
        { status: 400 }
      );
    }

    const response = NextResponse.redirect(`${baseUrl}/`);

    response.cookies.set(`mcp_oauth_${provider}`, accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set(`mcp_oauth_${provider}_connected`, "1", {
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
