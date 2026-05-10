# Fixes — Round 2

## What was broken

1. **Images stacked vertically in the chat input.** Every attachment, image or file,
   rendered as its own row in a `space-y-2` column, so dropping in 3 images gave you
   3 stacked thumbnails instead of a tidy row.
2. **Pasting froze the input.** `handlePasteEvent` only looked at `text/plain`, and
   when you pasted an image from the clipboard nothing happened. On big text pastes
   the synchronous `toBase64(...)` ran on the main thread and could lock the UI for
   seconds — felt like the app died, hence the refresh.
3. **localStorage overflowed with image data.** `Attachment.url` for images was a
   base64 data URL, and Zustand's `persist` writes the whole chat history to
   localStorage. A few photos and you blow past the ~5 MB quota → silent write
   failures, lost messages.

## What I changed

| File | What |
|---|---|
| `lib/supabase.ts` | New. Lazy browser client. Returns `null` if env vars missing → app keeps working locally. |
| `lib/upload.ts` | New. `uploadFile(file)` / `uploadDataUrl(...)` push to Supabase Storage and return a tiny public URL. Falls back to a data URL if Supabase isn't configured. |
| `components/chat-input.tsx` — file picker | Now shows an instant local preview (`URL.createObjectURL`) and uploads in the background. UI never blocks. |
| `components/chat-input.tsx` — paste handler | Detects images on the clipboard (`clipboardData.items`), uploads them async, and only falls through to the existing text/code/document logic for actual text pastes. No more freeze. |
| `components/chat-input.tsx` — attachments render | Images render in a horizontal `flex flex-row flex-wrap gap-2` row; files/links/code stay in the vertical list below. |
| `package.json` | Added `@supabase/supabase-js`. |
| `SUPABASE_SETUP.sql` | The SQL to run in the **Supabase** SQL editor (not Vercel — Vercel doesn't run SQL). |
| `.env.local.example` | Template for the two env vars. |

## How to set it up (5 min)

1. **Create a Supabase project** at <https://supabase.com> (free tier is fine).
2. **Run the SQL.** Open Supabase → SQL Editor → New query → paste the contents of
   `SUPABASE_SETUP.sql` → Run. This creates the `chat-uploads` bucket and the four
   RLS policies that allow anonymous read/write.
3. **Grab your keys.** Supabase → Project Settings → API. Copy:
   - `Project URL`
   - `anon` `public` key
4. **Local dev:** copy `.env.local.example` → `.env.local`, paste the two values,
   then `pnpm install && pnpm dev`.
5. **Vercel:** Project → Settings → Environment Variables → add the same two vars
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) → redeploy.

That's it. Image uploads now go to Supabase Storage; localStorage only holds the
short public URLs.

## Behavior without Supabase configured

The app still works. `getSupabase()` returns `null`, `uploadFile()` falls back to a
data URL, and you're back to the old localStorage-bloat behavior — but at least
nothing crashes. Configure Supabase to actually fix the storage problem.

## A note about Vercel and SQL

You wrote "tell me SQL to run on Vercel" — Vercel doesn't have a database and
doesn't run SQL. SQL runs in your **Supabase** dashboard. Vercel only hosts the
Next.js app and stores environment variables that the app reads at runtime.

## Not changed

- No API routes touched.
- No business logic in `lib/chat-store.ts`, `lib/neural-memory.ts`, etc. touched.
- The `Attachment` type is unchanged — `url` is still a string, just now usually a
  remote URL instead of a giant data URI.
