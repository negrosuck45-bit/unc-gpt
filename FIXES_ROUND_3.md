# iOS Lag Fixes (Round 3)

## What was making iOS lag

1. **Every keystroke during streaming wrote the full chat history (with base64 images) to localStorage.** zustand-persist serializes the entire state on each `set()`. With even one generated image (~500 KB base64) in history, that's a 500 KB JSON.stringify + setItem on every token. iOS Safari blocks the main thread on this.
2. **Big base64 data URLs lived in localStorage.** Once you pasted a few images, you'd hit the ~5 MB quota → silent write failures, then later, layout thrash from re-decoding base64 into `<img>` on every re-render.
3. `isStreaming` was being persisted, so flipping it true/false also wrote to disk.

## What I changed

### `lib/storage-offload.ts` (new)
- **Throttled writes** — localStorage writes are batched every 400ms instead of on every state change. This alone removes most streaming lag on iOS.
- **Quota-aware adapter** — if `setItem` throws QuotaExceededError, it walks the state, uploads big data URLs to Supabase Storage, swaps them for tiny public URLs, then retries.
- **Last-resort trim** — if Supabase isn't configured and quota is still hit, oldest chats are dropped instead of crashing.

### `lib/chat-store.ts`
- Switched persist to use the new safe storage.
- Added `partialize` so volatile fields (`isStreaming`) don't trigger writes.
- `addMessage` and `updateMessage` now fire-and-forget upload any big base64 `image` / `video` / attachment URL to Supabase, then patch the in-memory message with the resulting tiny public URL. Generated images never bloat localStorage anymore.

## Behavior

- **With Supabase configured** (recommended): big media auto-flows to Storage; localStorage stays under a few hundred KB no matter how many images you generate. Smooth on iOS.
- **Without Supabase**: throttling alone cuts most lag. If you eventually fill quota, oldest chats are trimmed instead of the app freezing.

## Deploy

No new SQL needed — the bucket from round 2 (`chat-uploads`) is reused, plus a new `auto-offload/` and `generated/` folder inside it (folders are virtual in Supabase Storage; nothing to create).

Just redeploy on Vercel. Same env vars as before:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
