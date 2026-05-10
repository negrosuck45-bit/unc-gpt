"use client"

import { useState } from "react"
import { useChatStore } from "@/lib/chat-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Copy, Check, Brain } from "lucide-react"
import { toast } from "sonner"

interface MemoryExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemoryExportDialog({ open, onOpenChange }: MemoryExportDialogProps) {
  const { projects, chats, currentChatId } = useChatStore()
  const [selectedProjectId, setSelectedProjectId] = useState<string>("__all__")
  const [copied, setCopied] = useState(false)

  const currentChat = chats.find((c) => c.id === currentChatId)
  const currentProject = projects.find((p) => p.id === currentChat?.projectId)

  // Build memory text
  const getMemoryText = (): string => {
    if (selectedProjectId === "__all__") {
      // Export all projects memory
      const parts = projects
        .filter((p) => p.memory)
        .map((p) => `## Project: ${p.name}\n\n${p.memory}`)
      return parts.length > 0 ? parts.join("\n\n---\n\n") : "No memory stored in any project."
    }

    if (selectedProjectId === "__chats__") {
      // Export current chat history as memory
      if (!currentChat) return "No active chat."
      const lines = currentChat.messages.map(
        (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
      )
      return `# Chat: ${currentChat.title}\n\n${lines.join("\n\n")}`
    }

    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) return "Project not found."
    return project.memory ?? "This project has no memory stored."
  }

  const memoryText = getMemoryText()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memoryText)
      setCopied(true)
      toast.success("Memory copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleDownload = () => {
    const blob = new Blob([memoryText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const name = selectedProjectId === "__all__"
      ? "all-memory"
      : selectedProjectId === "__chats__"
      ? "chat-history"
      : projects.find((p) => p.id === selectedProjectId)?.name ?? "memory"
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Memory downloaded!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Get / Export Memory
          </DialogTitle>
          <DialogDescription>
            View, copy, or download stored memory from your projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source selector */}
          <div className="space-y-1.5">
            <Label>Memory Source</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects Memory</SelectItem>
                {currentChat && (
                  <SelectItem value="__chats__">
                    Current Chat: {currentChat.title.slice(0, 30)}
                  </SelectItem>
                )}
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.memory ? `(${Math.round(p.memory.length / 100) / 10}KB)` : "(empty)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Memory stats */}
          {memoryText && !memoryText.includes("No memory") && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Characters</p>
                <p className="text-sm font-semibold">{memoryText.length.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="text-sm font-semibold">{Math.round(memoryText.length / 100) / 10}KB</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Lines</p>
                <p className="text-sm font-semibold">{memoryText.split('\n').length}</p>
              </div>
            </div>
          )}

          {/* Memory preview */}
          <div className="space-y-1.5">
            <Label>Memory Content</Label>
            <Textarea
              value={memoryText}
              readOnly
              className="h-48 text-xs font-mono resize-none"
              placeholder="No memory stored..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleCopy}
              disabled={!memoryText || memoryText.includes("No memory")}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleDownload}
              disabled={!memoryText || memoryText.includes("No memory")}
            >
              <Download className="h-4 w-4" />
              Download .txt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
