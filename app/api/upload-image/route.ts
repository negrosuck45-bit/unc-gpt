import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * Proxy uploads to a free anonymous file-host so we can feed Pollinations an
 * accessible URL for image-to-image editing.
 *
 * Tries tmpfiles.org first (JSON API, returns a view URL we rewrite to the
 * direct-download URL). Falls back to 0x0.st (plain-text body = direct URL).
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return Response.json({ error: "No file" }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Image must be under 8 MB" }, { status: 413 })
    }

    // ---------- tmpfiles.org ----------
    try {
      const fd = new FormData()
      fd.append("file", file, file.name || "upload.png")
      const res = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: fd,
      })
      if (res.ok) {
        const data: any = await res.json().catch(() => null)
        const viewUrl: string | undefined = data?.data?.url
        if (viewUrl && typeof viewUrl === "string") {
          // tmpfiles gives "https://tmpfiles.org/12345/file.png" – we need
          // "https://tmpfiles.org/dl/12345/file.png" for direct binary.
          const direct = viewUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/")
          return Response.json({ url: direct })
        }
      }
    } catch {
      // fall through
    }

    // ---------- 0x0.st fallback ----------
    try {
      const fd = new FormData()
      fd.append("file", file, file.name || "upload.png")
      const res = await fetch("https://0x0.st", {
        method: "POST",
        body: fd,
        headers: { "User-Agent": "uncgpt-image-edit/1.0" },
      })
      if (res.ok) {
        const url = (await res.text()).trim()
        if (url.startsWith("http")) return Response.json({ url })
      }
    } catch {
      // fall through
    }

    return Response.json(
      { error: "Upload failed. Try pasting an image URL instead." },
      { status: 502 },
    )
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Upload error" }, { status: 500 })
  }
}
