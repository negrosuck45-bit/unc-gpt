# Latest Updates & MCP Integration

## Round 4: MCP Connector Configuration + Image Rendering Fixes

### What's New

#### 1. **Full MCP Connector UI** (like manus.im)
- **New Component**: `components/mcp-settings.tsx`
- Settings → MCP Connectors button
- Add/remove/edit/test MCP servers
- Support for both HTTP and Stdio transports
- Preset connectors: GitHub, Supabase, Notion, Slack, Filesystem, Web Scraper
- Connection status indicators (✓ connected, ✗ error, ○ idle)
- Full localStorage persistence

#### 2. **Image & Video Rendering Fixed**
- Base64 data URLs now render correctly with native `<img>` tags
- NextImage falls back only for external URLs
- Proper MIME type handling for video playback
- Fixed CSS layout issues with `max-width: 100%` and `height: auto`
- Smooth animations and hover effects

#### 3. **MCP API Endpoint**
- New route: `app/api/mcp/route.ts`
- Actions: `list-tools`, `execute-tool`, `test-connector`
- Ready for production MCP server connections
- Error handling and timeout protection

### How to Use MCP Connectors

1. **Open Settings** → Click "⚙️ Settings"
2. **Click "🔌 MCP Connectors"** button
3. **Add a connector**:
   - Click any preset (GitHub, Notion, Slack, etc.)
   - Or manually configure with Command/URL
4. **Configure credentials**:
   - GitHub: Requires `GITHUB_TOKEN` env var
   - Supabase: Requires `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
   - Notion: Requires `NOTION_API_KEY`
   - Slack: Requires `SLACK_BOT_TOKEN`
5. **Test connection** → Click "Test" button to verify
6. **Enable** → Toggle the switch to activate

### Environment Variables Needed

```env
# For GitHub MCP
GITHUB_TOKEN=ghp_xxx...

# For Supabase MCP
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# For Notion MCP
NOTION_API_KEY=secret_xxx...

# For Slack MCP
SLACK_BOT_TOKEN=xoxb_xxx...
```

### File Changes Summary

```
NEW FILES:
- components/mcp-settings.tsx          ← Full MCP UI with presets
- app/api/mcp/route.ts               ← MCP API endpoint

MODIFIED FILES:
- components/settings-dialog.tsx       ← Added MCP Connectors button
- components/chat-messages.tsx        ← Fixed image/video rendering
```

### Rendering Fixes Details

**Before:**
- Base64 images failed with NextImage (needs unoptimized flag)
- Video elements had layout issues
- No fallback for data URLs

**After:**
```jsx
// Native <img> for base64 data URLs
{message.image.startsWith('data:') ? (
  <img src={message.image} ... />
) : (
  <NextImage src={message.image} unoptimized={...} ... />
)}

// Proper video styling
<video src={...} style={{ maxWidth: '100%', height: 'auto' }} />
```

### Test the New Features

1. **MCP Connectors:**
   ```bash
   npm run dev
   # Settings → MCP Connectors → Add GitHub (if GITHUB_TOKEN env set)
   # Click Test to verify connection
   ```

2. **Image Generation:**
   - Use /imagine to generate an image
   - Verify it displays correctly in chat
   - Should show smooth animation and proper sizing

### Deploy Notes

1. **Vercel**: Env vars auto-loaded from Vercel dashboard
2. **Local**: Add to `.env.local`:
   ```
   GITHUB_TOKEN=your_token
   NOTION_API_KEY=your_key
   ```
3. **MCP Servers**: Connectors stored in browser localStorage under `mcp-connectors`

### Next Steps

- [ ] Connect generated images to Supabase storage for persistence
- [ ] Add MCP tool execution in chat (call tools via /tools or @tool syntax)
- [ ] Create MCP server discovery UI
- [ ] Add custom MCP server creation wizard

### Troubleshooting

**Images not showing:**
- Check browser console for errors
- Verify CORS headers if external URL
- For data URLs, should always work (native img tag)

**MCP connector test fails:**
- Verify env variables are set
- Check network access to server URL
- For stdio, ensure package installed: `npm list @supabase/mcp-server-supabase`

**Storage issue:**
- Clear localStorage: DevTools → Application → localStorage → Clear
- Check localStorage quota: ~5-10MB per domain

---

**Version**: 1.4.0  
**Last Updated**: April 28, 2026
