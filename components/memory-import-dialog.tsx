"use client"

import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { parseExport, type ParseResult } from "@/lib/memory-parsers"
import { FileJson, Upload, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MemoryImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (memoryText: string) => void
}

export function MemoryImportDialog({
  open,
  onOpenChange,
  onImport,
}: MemoryImportDialogProps) {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setResult(null)
    setError(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFile = async (file: File) => {
    setError(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const parsed = parseExport(json)
      if (parsed.source === "unknown" || parsed.conversations.length === 0) {
        setError(
          "Could not recognise this as a ChatGPT or Claude export. Make sure you uploaded the JSON export file.",
        )
        setResult(null)
        return
      }
      setResult(parsed)
    } catch (err: any) {
      setError(
        "Failed to parse the JSON file. Make sure it's a valid AI export file.",
      )
      setResult(null)
    }
  }

  const handleImport = () => {
    if (!result) return
    onImport(result.memoryText)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import memory</DialogTitle>
          <DialogDescription>
            Upload a ChatGPT or Claude JSON export. Conversations are flattened into
            memory text and attached to the current project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 transition-colors",
              "hover:border-muted-foreground/50 hover:bg-accent/30",
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {fileName ?? "Click to select a JSON file"}
            </span>
            <span className="text-xs text-muted-foreground">
              conversations.json (ChatGPT) or data.json (Claude)
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <FileJson className="h-4 w-4" />
                <span className="font-medium capitalize">{result.source} export</span>
              </div>
              <div className="text-muted-foreground">
                {result.conversations.length} conversations · {result.totalMessages}{" "}
                messages · {result.memoryText.length.toLocaleString()} characters
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How to get an export:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>
                ChatGPT: Settings → Data controls → Export data → download the ZIP →
                upload <code>conversations.json</code>.
              </li>
              <li>
                Claude: Settings → Privacy → Export data → unzip → upload the JSON file.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!result}>
            Add to memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
