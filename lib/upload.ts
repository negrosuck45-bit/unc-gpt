// lib/upload.ts
// Uploads images (and other binary attachments) to Supabase Storage when
// configured, otherwise returns a local data: URL so the app still works.
//
// The returned string is what you should put in `Attachment.url`. For uploaded
// files this is a small public URL — perfect for localStorage. For the local
// fallback it's a data URL (and yes, those bloat localStorage; that's why
// configuring Supabase is recommended for image-heavy use).

import { getSupabase } from './supabase'
import { SUPABASE_BUCKET } from './supabase'

export interface UploadResult {
  url: string
  storedRemotely: boolean
  path?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function randomId(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  )
}

function extFromMime(mime: string | undefined, fallback = 'bin'): string {
  if (!mime) return fallback
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/avif': 'avif',
  }
  return map[mime] ?? (mime.includes('/') ? mime.split('/')[1] : fallback) ?? fallback
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Upload a File/Blob. Falls back to a data URL if Supabase isn't configured. */
export async function uploadFile(file: File | Blob, opts?: { folder?: string }): Promise<UploadResult> {
  const supabase = getSupabase()
  
  // Check if supabase is ready AND we have environment variables
  if (!supabase || !SUPABASE_URL) {
    const url = await fileToDataUrl(file)
    return { url, storedRemotely: false }
  }

  const folder = opts?.folder ?? 'images'
  const path = `${folder}/${randomId()}.${extFromMime((file as File).type || 'image/png')}`

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file, {
      contentType: (file as File).type || 'application/octet-stream',
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    // Network or RLS failure — degrade gracefully.
    const url = await fileToDataUrl(file)
    return { url, storedRemotely: false }
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, storedRemotely: true, path }
}

/** Convenience: upload by data URL (used by the paste handler). */
export async function uploadDataUrl(dataUrl: string, opts?: { folder?: string }): Promise<UploadResult> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return uploadFile(blob, opts)
}
