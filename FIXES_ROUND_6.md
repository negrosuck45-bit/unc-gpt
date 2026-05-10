# Round 6 — Real MCP + chat input redesign

## What's REALLY working now

### 1. Real MCP tool-calling (not a mock anymore)
- `app/api/mcp/route.ts`: real JSON-RPC 2.0 client over MCP Streamable HTTP. Sends the required `Accept: application/json, text/event-stream` header. Supports `initialize` → `tools/list` → `tools/call`.
- `app/api/chat/route.ts`: when `mcpConnectors` are sent in the chat request, the backend:
  1. Calls each enabled HTTP MCP server with `tools/list`
  2. Wraps tools as OpenAI-format function tools
  3. Runs a Groq tool-calling loop (up to 5 hops) via `llama-3.3-70b-versatile`, executing every `tool_calls` against the real MCP server
  4. Feeds tool results back into the model
  5. Streams the final answer normally
- `components/chat-interface.tsx`: reads `mcp-connectors` from localStorage and attaches `mcpConnectors` to every `/api/chat` POST.
- `components/mcp-settings.tsx`: "Test" button now calls `/api/mcp` with `action: test-connector`, which actually performs `tools/list` and shows the discovered tool count.

### 2. Honest limitation: stdio MCP servers DO NOT WORK
Stdio servers (`npx @modelcontextprotocol/server-...`) require spawning a child process. Vercel/serverless runtimes can't do that. Only **HTTP MCP servers** (URL-based) work. The settings dialog now states this clearly. For stdio servers, run them yourself behind an HTTP wrapper or use a hosted variant.

### 3. Chat input redesigned (manus.im style)
- Textarea is now full-width with the Send button **inside** it (right side)
- Action buttons (image / file / link / MCP / mic) are in a **horizontal row below** the textarea — no more vertical stack on mobile

### 4. Image attachments above the bubble (kept from Round 5)
- Sent images render as 64x64 thumbnails in a horizontal row above the message bubble.

## How to use it
1. Click the **Plug** icon in chat input → MCP Connectors
2. Add an HTTP MCP URL (e.g. `https://mcp.notion.com/mcp` with `Authorization: Bearer ...` header)
3. Toggle it on and click "Test" — you should see "Found N tools"
4. Now ask the AI something that requires the connector (e.g. "list my Notion pages")

## Notes
- We did NOT add Anthropic. Tool-calling uses your existing Groq keys (already in code).
- MCP tool execution happens server-side, so credentials in the connector config never leave your server log path.
