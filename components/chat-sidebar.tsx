"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"

import { useChatStore } from "@/lib/chat-store"
import { cn } from "@/lib/utils"
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Mic,
  ChevronDown,
  FolderOpen,
  Settings as SettingsIcon,
  Brain,
  Edit2,
  Search,
  Sparkles,
  MoreHorizontal,
  Code,
  Palette,
  Box,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { SettingsDialog } from "./settings-dialog"
import { SettingsPage } from "./settings-page"
import { ProjectsDialog } from "./projects-dialog"
import { MemoryImportDialog } from "./memory-import-dialog"
import { MemoryExportDialog } from "./memory-export-dialog"
import { ImageEditDialog } from "./image-edit-dialog"
import { ChatHistoryPanel } from "./chat-history-panel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Discord SVG icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

const DISCORD_URL = "https://discord.gg/your-invite"

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onChatSelect: (chatId: string, type: "text" | "voice") => void
  onModeChange: (mode: "text" | "voice" | "imagine") => void
  isMobile?: boolean
}

export function ChatSidebar({
  isOpen,
  onToggle,
  onChatSelect,
  onModeChange,
  isMobile = false,
}: ChatSidebarProps) {
  const {
    chats,
    projects,
    currentChatId,
    currentProjectId,
    setCurrentChat,
    setCurrentProject,
    createNewChat,
    deleteChat,
    updateChatProject,
    appendToProjectMemory,
    updateChatTitle,
  } = useChatStore()

  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memoryExportOpen, setMemoryExportOpen] = useState(false)
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsPageOpen, setSettingsPageOpen] = useState(false)

  // Filter chats based on search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats
    const query = searchQuery.toLowerCase()
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(query) ||
        chat.messages.some((m) => m.content.toLowerCase().includes(query))
    )
  }, [chats, searchQuery])

  // Group chats by time
  const groupedChats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const groups: { [key: string]: typeof chats } = {
      today: [],
      yesterday: [],
      previous7Days: [],
      previous30Days: [],
      older: [],
    }

    filteredChats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt)
      if (chatDate >= today) {
        groups.today.push(chat)
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat)
      } else if (chatDate >= last7Days) {
        groups.previous7Days.push(chat)
      } else if (chatDate >= last30Days) {
        groups.previous30Days.push(chat)
      } else {
        groups.older.push(chat)
      }
    })

    return groups
  }, [filteredChats])

  const handleNew = (type: "text" | "voice") => {
    const id = createNewChat(type)
    setCurrentChat(id)
    onModeChange(type)
    onChatSelect(id, type)
  }

  const handleSelect = (id: string, type: "text" | "voice") => {
    setCurrentChat(id)
    onChatSelect(id, type)
    onModeChange(type)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteChat(id)
  }

  const handleRenameStart = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation()
    setRenamingChatId(id)
    setRenamingText(currentTitle)
  }

  const handleRenameSave = (id: string) => {
    if (renamingText.trim()) {
      updateChatTitle(id, renamingText.trim())
    }
    setRenamingChatId(null)
    setRenamingText("")
  }

  const handleSelectProject = (id: string | null) => {
    setCurrentProject(id)
    if (currentChatId) updateChatProject(currentChatId, id)
  }

  const handleImportMemory = (text: string) => {
    let projectId = currentProjectId
    if (!projectId) {
      const id = useChatStore.getState().createProject({
        name: "Imported memory",
        description: "Created from an AI export import",
        memory: text,
      })
      setCurrentProject(id)
      if (currentChatId) updateChatProject(currentChatId, id)
    } else {
      appendToProjectMemory(projectId, text)
    }
  }

  // Collapsed icon-rail for DESKTOP only.
  if (!isOpen && !isMobile) {
    return (
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 56, opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: 56, minWidth: 56, height: '100dvh', maxHeight: '100dvh' }}
        className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col items-center py-3 gap-1 overflow-y-auto overflow-x-hidden sticky top-0"
      >
        <button
          onClick={onToggle}
          title="Open sidebar"
          aria-label="Open sidebar"
          className="group relative h-10 w-10 rounded-lg flex items-center justify-center hover:bg-accent/50 transition-colors mb-1"
        >
          <Image
            src="/uncgpt.png"
            alt="uncgpt"
            width={28}
            height={28}
            className="rounded-md shadow-sm transition-opacity duration-150 group-hover:opacity-0"
          />
          <PanelLeft className="h-5 w-5 absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </button>

        <RailButton title="New chat" onClick={() => handleNew("text")}>
          <Plus className="h-5 w-5" />
        </RailButton>
        <RailButton title="Search" onClick={() => { onToggle(); setShowSearch(true) }}>
          <Search className="h-5 w-5" />
        </RailButton>
        <RailButton title="Imagine" onClick={() => onModeChange("imagine")}>
          <Sparkles className="h-5 w-5" />
        </RailButton>
        <RailButton title="Connectors" onClick={() => setSettingsPageOpen(true)}>
          <Box className="h-5 w-5" />
        </RailButton>

        <div className="flex-1" />

        <RailButton
          title="Join our Discord"
          onClick={() => window.open(DISCORD_URL, "_blank")}
        >
          <DiscordIcon className="h-5 w-5 text-muted-foreground" />
        </RailButton>
        <RailButton title="Memory" onClick={() => setMemoryOpen(true)}>
          <Brain className="h-5 w-5" />
        </RailButton>
        <RailButton title="Settings" onClick={() => setSettingsPageOpen(true)}>
          <SettingsIcon className="h-5 w-5" />
        </RailButton>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        {settingsPageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl my-8">
              <SettingsPage onClose={() => setSettingsPageOpen(false)} />
            </div>
          </div>
        )}
        <MemoryImportDialog
          open={memoryOpen}
          onOpenChange={setMemoryOpen}
          onImport={handleImportMemory}
        />
      </motion.aside>
    )
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: 280, minWidth: 280, height: '100dvh', maxHeight: '100dvh' }}
            className={cn("bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto", isMobile ? "fixed inset-y-0 left-0 z-[100] shadow-2xl" : "relative")}
          >
            {/* Header - Claude style */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/uncgpt.png"
                  alt="uncgpt"
                  width={28}
                  height={28}
                  className="rounded-md"
                />
                <span className="font-semibold text-base">uncgpt</span>
                <button className="ml-1 p-1 hover:bg-accent/50 rounded-md">
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
              </div>
              <button
                onClick={onToggle}
                title="Close sidebar"
                aria-label="Close sidebar"
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent/50 transition-colors"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Items - Claude style */}
            <div className="px-2 space-y-0.5">
              <NavItem
                icon={<Plus className="h-4 w-4" />}
                label="New chat"
                onClick={() => handleNew("text")}
              />
              <NavItem
                icon={<Search className="h-4 w-4" />}
                label="Search"
                onClick={() => setShowSearch(!showSearch)}
              />
              <NavItem
                icon={<MessageSquare className="h-4 w-4" />}
                label="Chats"
                onClick={() => setHistoryOpen(true)}
              />
              <NavItem
                icon={<FolderOpen className="h-4 w-4" />}
                label="Projects"
                onClick={() => setProjectsOpen(true)}
              />
              <NavItem
                icon={<Box className="h-4 w-4" />}
                label="Connectors"
                onClick={() => setSettingsPageOpen(true)}
              />
            </div>

            {/* Search input */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pt-3"
                >
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recents section */}
            <div className="flex-1 overflow-y-auto px-2 pt-4">


              <div className="text-xs font-medium text-muted-foreground px-2 pb-2">
                Recents
              </div>

              {/* Today */}
              {groupedChats.today.length > 0 && (
                <ChatGroup
                  label="Today"
                  chats={groupedChats.today}
                  currentChatId={currentChatId}
                  hoveredChatId={hoveredChatId}
                  renamingChatId={renamingChatId}
                  renamingText={renamingText}
                  setRenamingText={setRenamingText}
                  setHoveredChatId={setHoveredChatId}
                  handleSelect={handleSelect}
                  handleDelete={handleDelete}
                  handleRenameStart={handleRenameStart}
                  handleRenameSave={handleRenameSave}
                  setRenamingChatId={setRenamingChatId}
                />
              )}

              {/* Yesterday */}
              {groupedChats.yesterday.length > 0 && (
                <ChatGroup
                  label="Yesterday"
                  chats={groupedChats.yesterday}
                  currentChatId={currentChatId}
                  hoveredChatId={hoveredChatId}
                  renamingChatId={renamingChatId}
                  renamingText={renamingText}
                  setRenamingText={setRenamingText}
                  setHoveredChatId={setHoveredChatId}
                  handleSelect={handleSelect}
                  handleDelete={handleDelete}
                  handleRenameStart={handleRenameStart}
                  handleRenameSave={handleRenameSave}
                  setRenamingChatId={setRenamingChatId}
                />
              )}

              {/* Previous 7 Days */}
              {groupedChats.previous7Days.length > 0 && (
                <ChatGroup
                  label="Previous 7 Days"
                  chats={groupedChats.previous7Days}
                  currentChatId={currentChatId}
                  hoveredChatId={hoveredChatId}
                  renamingChatId={renamingChatId}
                  renamingText={renamingText}
                  setRenamingText={setRenamingText}
                  setHoveredChatId={setHoveredChatId}
                  handleSelect={handleSelect}
                  handleDelete={handleDelete}
                  handleRenameStart={handleRenameStart}
                  handleRenameSave={handleRenameSave}
                  setRenamingChatId={setRenamingChatId}
                />
              )}

              {/* Previous 30 Days */}
              {groupedChats.previous30Days.length > 0 && (
                <ChatGroup
                  label="Previous 30 Days"
                  chats={groupedChats.previous30Days}
                  currentChatId={currentChatId}
                  hoveredChatId={hoveredChatId}
                  renamingChatId={renamingChatId}
                  renamingText={renamingText}
                  setRenamingText={setRenamingText}
                  setHoveredChatId={setHoveredChatId}
                  handleSelect={handleSelect}
                  handleDelete={handleDelete}
                  handleRenameStart={handleRenameStart}
                  handleRenameSave={handleRenameSave}
                  setRenamingChatId={setRenamingChatId}
                />
              )}

              {/* Older */}
              {groupedChats.older.length > 0 && (
                <ChatGroup
                  label="Older"
                  chats={groupedChats.older}
                  currentChatId={currentChatId}
                  hoveredChatId={hoveredChatId}
                  renamingChatId={renamingChatId}
                  renamingText={renamingText}
                  setRenamingText={setRenamingText}
                  setHoveredChatId={setHoveredChatId}
                  handleSelect={handleSelect}
                  handleDelete={handleDelete}
                  handleRenameStart={handleRenameStart}
                  handleRenameSave={handleRenameSave}
                  setRenamingChatId={setRenamingChatId}
                />
              )}

              {/* Empty state */}
              {filteredChats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-sidebar-border bg-sidebar p-2 space-y-0.5">
              <NavItem
                icon={<DiscordIcon className="h-4 w-4" />}
                label="Join Discord"
                onClick={() => window.open(DISCORD_URL, "_blank")}
              />
              <NavItem
                icon={<Brain className="h-4 w-4" />}
                label="Memory"
                onClick={() => setMemoryOpen(true)}
              />
              <NavItem
                icon={<SettingsIcon className="h-4 w-4" />}
                label="Settings"
                onClick={() => setSettingsPageOpen(true)}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {settingsPageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <SettingsPage onClose={() => setSettingsPageOpen(false)} />
          </div>
        </div>
      )}
      <ProjectsDialog open={projectsOpen} onOpenChange={setProjectsOpen} />
      <MemoryImportDialog
        open={memoryOpen}
        onOpenChange={setMemoryOpen}
        onImport={handleImportMemory}
      />
      <MemoryExportDialog
        open={memoryExportOpen}
        onOpenChange={setMemoryExportOpen}
      />
      <ImageEditDialog open={imageEditOpen} onOpenChange={setImageEditOpen} />
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg h-[600px] shadow-2xl">
            <ChatHistoryPanel
              onClose={() => setHistoryOpen(false)}
              onSelectChat={(id) => {
                const chat = chats.find((c) => c.id === id)
                if (chat) handleSelect(id, chat.type)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

// Navigation item component
interface NavItemProps {
  icon: React.ReactNode
  label: string
  badge?: string
  onClick: () => void
  active?: boolean
}

function NavItem({ icon, label, badge, onClick, active }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground hover:bg-accent/50"
      )}
    >
      <span className="opacity-70">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
          {badge}
        </span>
      )}
    </button>
  )
}

// Chat group component
interface ChatGroupProps {
  label: string
  chats: any[]
  currentChatId: string | null
  hoveredChatId: string | null
  renamingChatId: string | null
  renamingText: string
  setRenamingText: (text: string) => void
  setHoveredChatId: (id: string | null) => void
  handleSelect: (id: string, type: "text" | "voice") => void
  handleDelete: (e: React.MouseEvent, id: string) => void
  handleRenameStart: (e: React.MouseEvent, id: string, title: string) => void
  handleRenameSave: (id: string) => void
  setRenamingChatId: (id: string | null) => void
}

function ChatGroup({
  label,
  chats,
  currentChatId,
  hoveredChatId,
  renamingChatId,
  renamingText,
  setRenamingText,
  setHoveredChatId,
  handleSelect,
  handleDelete,
  handleRenameStart,
  handleRenameSave,
  setRenamingChatId,
}: ChatGroupProps) {
  if (chats.length === 0) return null

  return (
    <div className="mb-4">
      <div className="text-[11px] font-medium text-muted-foreground/70 px-2 py-1 uppercase tracking-wider">
        {label}
      </div>
      <div className="space-y-0.5">
        {chats.map((chat) => (
          <div key={chat.id}>
            {renamingChatId === chat.id ? (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/30 border border-accent/50">
                <input
                  autoFocus
                  type="text"
                  value={renamingText}
                  onChange={(e) => setRenamingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSave(chat.id)
                    if (e.key === "Escape") setRenamingChatId(null)
                  }}
                  onBlur={() => handleRenameSave(chat.id)}
                  className="flex-1 bg-transparent border-none text-sm outline-none"
                  placeholder="Rename..."
                />
              </div>
            ) : (
              <div
                onClick={() => handleSelect(chat.id, chat.type)}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors",
                  currentChatId === chat.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <span className="flex-1 truncate">{chat.title || "Untitled"}</span>
                {hoveredChatId === chat.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-background rounded-md transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenameStart(e as any, chat.id, chat.title)
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(e as any, chat.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Rail button for collapsed state
interface RailButtonProps {
  title: string
  onClick: () => void
  children: React.ReactNode
}

function RailButton({ title, onClick, children }: RailButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="h-10 w-10 rounded-lg flex items-center justify-center text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-accent/50 transition-colors"
    >
      {children}
    </button>
  )
}