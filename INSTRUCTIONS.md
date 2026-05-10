# MCP OAuth Connect — Setup Instructions

This adds a Vercel/Claude/Manus-style OAuth flow for **Notion, Linear, GitHub,
Google Drive, Slack, Vercel, and Obsidian**. Users click a chip in the chat header → get
redirected to the provider's consent page → land back in the app already
connected. No tokens are pasted into the UI; tokens are stored in **httpOnly
cookies** on the server and auto-attached to MCP requests.

**Note:** In this setup, only Supabase credentials stay in `.env`. All other provider secrets (GitHub, Notion, etc.) are hardcoded in the API routes.

## 1. Set the redirect base URL

Add this to your environment (locally `.env.local`, production: Vercel
project env vars):

```
OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app
```

For local dev:
```
OAUTH_REDIRECT_BASE_URL=http://localhost:3000
```

The callback URL each provider needs is:
```
{OAUTH_REDIRECT_BASE_URL}/api/mcp/oauth/{provider}/callback
```
e.g. `https://your-app.vercel.app/api/mcp/oauth/notion/callback`.

## 2. Register one OAuth app per provider

For each provider, paste the callback URL above (with the matching `{provider}`
slug) as the **Redirect / Callback URL**, then copy the client_id and
client_secret into your env vars.

### Notion
- Go to https://www.notion.so/profile/integrations → **New integration**
- Type: **Public** (required for OAuth; internal integrations don't redirect)
- Redirect URI: `…/api/mcp/oauth/notion/callback`
- Env: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

### Linear
- https://linear.app/settings/api → **OAuth applications** → **New**
- Callback URL: `…/api/mcp/oauth/linear/callback`
- Scopes (already requested): `read`, `write`, `issues:create`
- Env: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`

### GitHub
- https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
  (or a GitHub App if you prefer fine-grained perms)
- Authorization callback URL: `…/api/mcp/oauth/github/callback`
- Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### Google Drive
- https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth Client ID**
- Application type: **Web application**
- Authorized redirect URIs: `…/api/mcp/oauth/google_drive/callback`
- Enable the **Google Drive API** in the same project
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Slack
- https://api.slack.com/apps → **Create New App** → **From scratch**
- OAuth & Permissions → **Redirect URLs**: `…/api/mcp/oauth/slack/callback`
- Bot Token Scopes: `chat:write`, `channels:read`, `channels:history`, `users:read`
- Env: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`

### Vercel
- Go to https://vercel.com/dashboard/settings/auth/oauth-apps → **Create New**
- Redirect URI: `…/api/mcp/oauth/vercel/callback`
- Env: `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`

### Obsidian
- Requires the **Obsidian MCP Bridge** plugin installed in your vault.
- Gateway URL: `…/api/mcp/oauth/obsidian/callback`
- Env: `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_AUTH_TOKEN` (Optional if using the Redirect Bridge)

## 3. Restart / redeploy

After setting env vars, restart `next dev` or redeploy on Vercel. The chips
under the chat header will switch from greyed-out (not configured) to
clickable. Click a chip → OAuth redirect → back to the app, chip turns
green. Click a green chip again to disconnect.

## How it works

- `GET /api/mcp/oauth/{provider}/start` → redirects to the provider's authorize URL with a CSRF state cookie.
- `GET /api/mcp/oauth/{provider}/callback` → exchanges the code for a token, stores it in an `httpOnly` cookie `mcp_oauth_{provider}`, redirects back to `/`.
- `GET /api/mcp/oauth/status` → returns `{configured, connected}` per provider for the UI chips.
- `POST /api/mcp/oauth/disconnect` → clears the cookies for one provider.
- `POST /api/mcp` → automatically reads any present OAuth cookies and attaches `Authorization: Bearer <token>` when calling the matching MCP server (`mcp.notion.com`, `mcp.linear.app`, etc.). You no longer need to paste tokens in the old MCP Settings dialog.

## Security notes

- Tokens never reach the browser JS — they're set with `httpOnly; secure; samesite=lax`.
- A non-httpOnly flag cookie `mcp_oauth_{provider}_connected=1` is set so the UI knows whether to show "Connected" without exposing the token.
- For multi-user production use, swap the cookie store for a per-user DB row keyed by `auth.uid()` (Supabase) or your session id. The current single-cookie design is fine for personal/single-user deployments.
