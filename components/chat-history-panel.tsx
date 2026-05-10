"use client"

import { useState } from "react"
import { useChatStore } from "@/lib/chat-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Mic,
  Search,
  Trash2,
  X,
  Clock,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatHistoryPanelProps {
  onClose: () => void
  onSelectChat: (chatId: string) => void
}

export function ChatHistoryPanel({ onClose, onSelectChat }: ChatHistoryPanelProps) {
  const { chats, currentChatId, deleteChat } = useChatStore()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "text" | "voice">("all")

  const filtered = chats
    .filter((c) => {
      if (filter === "text") return c.type === "text"
      if (filter === "voice") return c.type === "voice"
      return true
    })
    .filter((c) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  // Group by date
  const grouped: Record<string, typeof filtered> = {}
  for (const chat of filtered) {
    const label = formatDate(chat.createdAt)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(chat)
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-border w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">Chat History</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {(["all", "text", "voice"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs capitalize flex-1"
            onClick={() => setFilter(f)}
          >
            {f === "text" && <MessageSquare className="h-3 w-3 mr-1" />}
            {f === "voice" && <Mic className="h-3 w-3 mr-1" />}
            {f === "all" && <Clock className="h-3 w-3 mr-1" />}
            {f === "all" ? "All" : f === "text" ? "Text" : "Voice"}
          </Button>
        ))}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p className="text-sm">No chats found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label}>
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30 sticky top-0">
                {label}
              </div>
              {items.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30",
                    currentChatId === chat.id && "bg-muted"
                  )}
                  onClick={() => {
                    onSelectChat(chat.id)
                    onClose()
                  }}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    {chat.type === "voice" ? (
                      <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {chat.messages.length} message{chat.messages.length !== 1 ? "s" : ""}
                      {chat.model && (
                        <span className="ml-1 opacity-60">· {chat.model.split("/").pop()}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Delete this chat?")) {
                          deleteChat(chat.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        {chats.length} total chat{chats.length !== 1 ? "s" : ""}
        {" · "}
        {chats.reduce((n, c) => n + c.messages.length, 0)} messages
      </div>
    </div>
  )
}
