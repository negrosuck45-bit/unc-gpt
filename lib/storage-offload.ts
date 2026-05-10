// lib/storage-offload.ts
// Keeps localStorage small and iOS smooth.
//
// Two responsibilities:
//   1) Detect when an attachment / message field is a big base64 data URL
//      and replace it with a tiny Supabase Storage public URL.
//   2) Provide a localStorage adapter for zustand/persist that:
//        - throttles writes (no fsync on every keystroke)
//        - on QuotaExceededError, walks the state, offloads the biggest
//          data URLs to Supabase, then retries.
//
// Safe to use even when Supabase isn't configured: offload becomes a no-op
// and we just trim oldest chats if quota is hit.

import { uploadDataUrl } from './upload'
import { getSupabase } from './supabase'

// Anything bigger than this stays out of localStorage.
// 200 KB of base64 ≈ 150 KB raw. iOS Safari starts choking around ~3-5 MB total.
const INLINE_MAX_BYTES = 200 * 1024

export function isBigDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('data:') &&
    value.length > INLINE_MAX_BYTES
  )
}

/** Walk an arbitrary state tree, upload any oversized data: URL, replace inline. */
export async function offloadBigDataUrls(state: any): Promise<number> {
  if (!getSupabase()) return 0 // no remote target — leave as-is

  let offloaded = 0
  const tasks: Promise<void>[] = []

  const visit = (node: any, parent: any, key: string | number) => {
    if (node == null) return
    if (isBigDataUrl(node)) {
      tasks.push(
        uploadDataUrl(node, { folder: 'auto-offload' })
          .then((res) => {
            if (res.storedRemotely) {
              parent[key] = res.url
              offloaded++
            }
          })
          .catch(() => {/* keep original on failure */}),
      )
      return
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i], node, i)
    } else if (typeof node === 'object') {
      for (const k of Object.keys(node)) visit(node[k], node, k)
    }
  }

  visit(state, { root: state }, 'root')
  await Promise.all(tasks)
  return offloaded
}

// ---------------------------------------------------------------------------
// Throttled, quota-aware localStorage adapter for zustand/persist
// ---------------------------------------------------------------------------

const WRITE_THROTTLE_MS = 400

export function createSafeStorage() {
  if (typeof window === 'undefined') {
    // SSR no-op
    return {
      getItem: (_: string) => null,
      setItem: (_: string, __: string) => {},
      removeItem: (_: string) => {},
    }
  }

  const pending = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let flushing = false

  const flush = async () => {
    if (flushing) return
    flushing = true
    try {
      for (const [key, value] of Array.from(pending.entries())) {
        pending.delete(key)
        await writeWithRecovery(key, value)
      }
    } finally {
      flushing = false
      timer = null
      if (pending.size > 0) schedule()
    }
  }

  const schedule = () => {
    if (timer) return
    timer = setTimeout(flush, WRITE_THROTTLE_MS)
  }

  const writeWithRecovery = async (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value)
      return
    } catch (err) {
      // Likely QuotaExceededError. Try to offload big data URLs to Supabase.
      try {
        const parsed = JSON.parse(value)
        const stateNode = parsed?.state ?? parsed
        const offloaded = await offloadBigDataUrls(stateNode)
        const trimmed = JSON.stringify(parsed)

        if (offloaded > 0) {
          try {
            window.localStorage.setItem(key, trimmed)
            return
          } catch {/* still too big — fall through to trim */}
        }

        // Last resort: drop oldest chats until it fits.
        if (stateNode && Array.isArray(stateNode.chats) && stateNode.chats.length > 1) {
          const halved = {
            ...parsed,
            state: { ...stateNode, chats: stateNode.chats.slice(0, Math.ceil(stateNode.chats.length / 2)) },
          }
          try {
            window.localStorage.setItem(key, JSON.stringify(halved))
            // eslint-disable-next-line no-console
            console.warn('[storage] localStorage full — trimmed oldest chats to recover.')
            return
          } catch {/* give up silently */}
        }
      } catch {
        // ignore parse failures
      }
    }
  }

  return {
    getItem: (name: string) => window.localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      pending.set(name, value)
      schedule()
    },
    removeItem: (name: string) => {
      pending.delete(name)
      window.localStorage.removeItem(name)
    },
  }
}
