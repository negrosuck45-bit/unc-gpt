# Round 5 fixes

## What changed
1. **Chat messages: images render small + horizontally ABOVE the text bubble**
   - `components/chat-messages.tsx`: `AttachmentPreview` now supports `compact` mode (64x64 thumbnails)
   - User messages: image attachments render as a horizontal flex row above the bubble; non-image files stay inside the bubble
2. **MCP Connectors button on chat input** (like manus.im)
   - `components/chat-input.tsx`: new Plug icon button next to the link button; opens the existing `MCPSettings` dialog
   - The dialog already supports presets: GitHub, Supabase, Notion, Slack, Filesystem, Web Scraper, plus custom HTTP/stdio servers
   - Stored in `localStorage` under `mcp-connectors`

## MCP — important
The frontend stores connector configs but cannot itself execute stdio MCP servers in the browser. To actually use them you need a server-side bridge (Next.js API route) that spawns the process or proxies HTTP MCP servers. The button + UI is wired; wiring tool-calls into the model loop is the next step.

## Notes on Anthropic key
You said "don't use Anthropic key". The project already uses your existing model providers in `lib/models/`. No Anthropic key was added.
