"use client"

import { useState } from "react"
import { useChatStore, type Project } from "@/lib/chat-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FolderOpen,
  Plus,
  Trash2,
  Save,
  Upload,
  X,
} from "lucide-react"
import { MemoryImportDialog } from "./memory-import-dialog"
import { cn } from "@/lib/utils"

interface ProjectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectApplied?: (projectId: string) => void
}

export function ProjectsDialog({
  open,
  onOpenChange,
  onProjectApplied,
}: ProjectsDialogProps) {
  const {
    projects,
    currentProjectId,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
  } = useChatStore()

  const [selected, setSelected] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [memory, setMemory] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [memoryImportOpen, setMemoryImportOpen] = useState(false)

  const activeProjects = projects

  const openProject = (p: Project | null) => {
    setSelected(p)
    setIsCreating(false)
    setName(p?.name ?? "")
    setDescription(p?.description ?? "")
    setInstructions(p?.instructions ?? "")
    setMemory(p?.memory ?? "")
  }

  const startNew = () => {
    setSelected(null)
    setIsCreating(true)
    setName("")
    setDescription("")
    setInstructions("")
    setMemory("")
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (selected) {
      updateProject(selected.id, {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        memory: memory.trim(),
      })
    } else {
      const id = createProject({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        memory: memory.trim(),
      })
      setCurrentProject(id)
      onProjectApplied?.(id)
    }
    setIsCreating(false)
    setSelected(null)
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this project? Attached chats will keep their history.")) {
      deleteProject(id)
      if (selected?.id === id) {
        setSelected(null)
        setIsCreating(false)
      }
    }
  }

  const handleApply = (id: string) => {
    setCurrentProject(id)
    onProjectApplied?.(id)
    onOpenChange(false)
  }

  const handleClearContext = () => {
    setCurrentProject(null)
    onOpenChange(false)
  }

  const showEditor = isCreating || !!selected

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Projects</DialogTitle>
            <DialogDescription>
              Give a chat persistent instructions and memory. Like Claude Projects, but
              stored only in your browser.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[220px_1fr] border-t border-border h-[480px]">
            {/* Sidebar */}
            <div className="border-r border-border bg-muted/30 flex flex-col">
              <div className="p-3 border-b border-border space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={startNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New project
                </Button>
                {currentProjectId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={handleClearContext}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Use no project
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {activeProjects.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3 text-balance">
                    No projects yet. Create one to give your chats custom instructions
                    and persistent memory.
                  </p>
                )}
                {activeProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openProject(p)}
                    className={cn(
                      "group w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                      selected?.id === p.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate flex-1">{p.name}</span>
                    {currentProjectId === p.id && (
                      <span className="text-[10px] text-muted-foreground">active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex flex-col overflow-hidden">
              {showEditor ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Name</Label>
                      <Input
                        id="project-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Research assistant"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-description">Description</Label>
                      <Input
                        id="project-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional short summary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-instructions">Custom instructions</Label>
                      <Textarea
                        id="project-instructions"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Tell the assistant how to behave in this project. These instructions are prepended to every chat attached to this project."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="project-memory">Memory</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setMemoryImportOpen(true)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Import from ChatGPT / Claude
                        </Button>
                      </div>
                      <Textarea
                        id="project-memory"
                        value={memory}
                        onChange={(e) => setMemory(e.target.value)}
                        placeholder="Notes, facts, previous conversations, or pasted text. This is included as context in every message."
                        rows={8}
                      />
                      <p className="text-xs text-muted-foreground">
                        {memory.length.toLocaleString()} characters.
                        Long memories are automatically truncated to fit in context.
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="border-t border-border px-6 py-3">
                    {selected && (
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive mr-auto"
                        onClick={() => handleDelete(selected.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                    {selected && (
                      <Button variant="secondary" onClick={() => handleApply(selected.id)}>
                        Use in current chat
                      </Button>
                    )}
                    <Button onClick={handleSave} disabled={!name.trim()}>
                      <Save className="h-4 w-4 mr-2" />
                      {selected ? "Save changes" : "Create project"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-10 text-center text-sm text-muted-foreground">
                  <div>
                    Select a project to edit, or create a new one to give your chats
                    persistent context.
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MemoryImportDialog
        open={memoryImportOpen}
        onOpenChange={setMemoryImportOpen}
        onImport={(text) => {
          setMemory((current) => (current ? current + "\n\n" + text : text))
        }}
      />
    </>
  )
}
