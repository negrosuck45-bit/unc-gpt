"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Download, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildPollinationsUrl(prompt: string, seed?: number) {
  const s = seed ?? Math.floor(Math.random() * 1_000_000_000)
  const params = new URLSearchParams({
    seed: String(s),
    nologo: "true",
    model: "flux",
    width: "1024",
    height: "1024",
  })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`
}

export function ImageEditDialog({ open, onOpenChange }: ImageEditDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [description, setDescription] = useState<string | null>(null)
  const [describing, setDescribing] = useState(false)

  const reset = () => {
    setPrompt("")
    setResultUrl(null)
    setDescription(null)
    setGenerating(false)
    setDescribing(false)
  }

  const canSubmit = !!prompt.trim() && !generating

  const handleSubmit = () => {
    if (!canSubmit) return
    const url = buildPollinationsUrl(prompt.trim())
    setResultUrl(url)
    setGenerating(true)
    setDescription(null) // clear old description when new image generates
  }

  const handleDownload = async () => {
    if (!resultUrl) return
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `generated-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, "_blank")
    }
  }

  const handleDescribe = async () => {
    if (!resultUrl || !prompt.trim()) return
    setDescribing(true)
    try {
      // Use Pollinations text model to generate a description based on the prompt
      const describePrompt = `Write a short, vivid description of an image that matches this prompt: "${prompt}". The description should be 1-2 sentences, like a caption.`
      const textUrl = `https://text.pollinations.ai/prompt/${encodeURIComponent(describePrompt)}`
      const res = await fetch(textUrl)
      const text = await res.text()
      setDescription(text.trim() || "A beautiful AI-generated image.")
    } catch (err) {
      setDescription("Could not generate description. Try again.")
    } finally {
      setDescribing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>
            Create fresh images from text prompts using FLUX on Pollinations. Free and fast.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A serene mountain lake at sunrise, photorealistic, 4k"
            />
          </div>

          {resultUrl && (
            <div className="space-y-3">
              <figure className="space-y-1">
                <figcaption className="text-xs text-muted-foreground flex items-center gap-2">
                  Generated Image
                  {generating && <Loader2 className="h-3 w-3 animate-spin" />}
                </figcaption>
                <img
                  key={resultUrl}
                  src={resultUrl}
                  alt="Generated"
                  onLoad={() => setGenerating(false)}
                  onError={() => setGenerating(false)}
                  className="w-full rounded-md border border-border object-contain max-h-80 bg-muted"
                />
              </figure>

              {description && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <span className="font-medium">Description: </span>
                  {description}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleDescribe} disabled={describing}>
                  {describing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Describe
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {resultUrl ? "Regenerate" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}