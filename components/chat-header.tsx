"use client"

import { useState } from "react"
import { useChatStore, MODELS, getModelsByFamily, type Chat, type Project } from "@/lib/chat-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Settings as SettingsIcon,
  FolderOpen,
  ChevronDown,
  Wand2,
  Check,
  Zap,
  Cloud,
  Sparkles,
  Cpu,
  Lock,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react"
import { SettingsDialog } from "./settings-dialog"
import { ProjectsDialog } from "./projects-dialog"
import { ImageEditDialog } from "./image-edit-dialog"

import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Map model families to their icon filenames (stored in /public)
const familyIcons: Record<string, string> = {
  claude: "/claude-icon.svg",
  deepseek: "/deepseek.png",
  qwen: "/qwen.png",
  gemma: "/gemma.png",
  glm: "/glm.png",
  "gpt-oss": "/gpt-oss.png",
  kiwi: "/kiwi.png",
  llama: "/llama.png",
}

interface ChatHeaderProps {
  project: Project | null
  chat: Chat | null
  activeModelInfo?: { provider: string; model: string } | null
  onOpenSidebar?: () => void
  isSidebarOpen?: boolean
}

export function ChatHeader({ project, chat, activeModelInfo, onOpenSidebar, isSidebarOpen }: ChatHeaderProps) {
  const { settings, updateSettings, updateChatModel } = useChatStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [imageEditOpen, setImageEditOpen] = useState(false)

  // Lock the model once chat has messages - user must create new chat to change model
  const isLocked = !!chat && chat.messages.length > 0

  const displayModelValue = chat?.model ? chat.model : settings.model
  const currentModel = MODELS.find((m) => m.value === displayModelValue)

  const handleModelChange = (value: string) => {
    // If locked, show alert and don't change
    if (isLocked) {
      alert("Model is locked for this chat. Create a new chat to use a different model.")
      return
    }

    const model = MODELS.find((m) => m.value === value)
    if (!model) return

    if (chat?.id) {
      updateChatModel(chat.id, model.value, model.provider)
    } else {
      updateSettings({ provider: model.provider, model: model.value })
    }
  }

  // Get models by family
  const autoModels = getModelsByFamily("auto")
  const claudeModels = getModelsByFamily("claude")
  const deepseekModels = getModelsByFamily("deepseek")
  const qwenModels = getModelsByFamily("qwen")
  const gemmaModels = getModelsByFamily("gemma")
  const gptOssModels = getModelsByFamily("gpt-oss")
  const glmModels = getModelsByFamily("glm")
  const kiwiModels = getModelsByFamily("kiwi")
  const llamaModels = getModelsByFamily("llama")

  const triggerLabel = currentModel?.label ?? "Select model"

  return (
    <>
      <div className="flex flex-col border-b border-border bg-background/80 backdrop-blur-sm">
      <header className="flex items-center gap-2 px-3 py-2.5 min-h-[48px]">
        {/* Sidebar trigger — MOBILE ONLY */}
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-8 w-8 shrink-0 hover:bg-accent/50 md:hidden"
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Model Selector */}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild disabled={isLocked}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 font-medium max-w-[220px] ${isLocked ? "opacity-70 cursor-not-allowed" : "hover:bg-accent/50"}`}
                    disabled={isLocked}
                  >
                    <div className="flex flex-col items-start">
                      <span className="truncate flex items-center gap-1.5">
                        {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {triggerLabel}
                      </span>
                    </div>
                    {!isLocked && <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isLocked && (
                <TooltipContent side="bottom">
                  <p className="text-xs">Model is locked. Create a new chat to change model.</p>
                </TooltipContent>
              )}
              <DropdownMenuContent align="start" className="min-w-[340px] max-h-[80vh] overflow-y-auto">

                {/* ── AUTO MODE ── */}
                {autoModels.map((m) => (
                  <DropdownMenuItem
                    key={m.value}
                    onClick={() => handleModelChange(m.value)}
                    className="flex items-start justify-between gap-2 py-2.5 cursor-pointer bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{m.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                      </div>
                    </div>
                    {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* ── CLAUDE ── */}
                {claudeModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Claude</DropdownMenuLabel>
                    {claudeModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.claude}
                            alt="Claude"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-sky-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── QWEN ── */}
                {qwenModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Qwen</DropdownMenuLabel>
                    {qwenModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.qwen}
                            alt="Qwen"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── LLAMA ── */}
                {llamaModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Llama</DropdownMenuLabel>
                    {llamaModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.llama}
                            alt="Llama"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── KIMI ── */}
                {kiwiModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Kimi</DropdownMenuLabel>
                    {kiwiModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.kiwi}
                            alt="Kimi"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── DEEPSEEK ── */}
                {deepseekModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">DeepSeek</DropdownMenuLabel>
                    {deepseekModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.deepseek}
                            alt="DeepSeek"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── GEMMA ── */}
                {gemmaModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Gemma</DropdownMenuLabel>
                    {gemmaModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.gemma}
                            alt="Gemma"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── GLM ── */}
                {glmModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">GLM</DropdownMenuLabel>
                    {glmModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons.glm}
                            alt="GLM"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── GPT-OSS ── */}
                {gptOssModels.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">GPT-OSS</DropdownMenuLabel>
                    {gptOssModels.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        onClick={() => handleModelChange(m.value)}
                        className="flex items-start justify-between gap-2 py-2 cursor-pointer ml-2"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Image
                            src={familyIcons["gpt-oss"]}
                            alt="GPT-OSS"
                            width={16}
                            height={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                          </div>
                        </div>
                        {displayModelValue === m.value && <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-pink-500" />}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Tooltip>
        </TooltipProvider>

        {/* Project selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 font-medium hover:bg-accent/50">
              <FolderOpen className="h-4 w-4 opacity-60" />
              <span className="hidden sm:inline truncate max-w-[120px]">
                {project?.name ?? "No project"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { }}>
              Manage Projects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

      </header>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProjectsDialog open={projectsOpen} onOpenChange={setProjectsOpen} />
      <ImageEditDialog open={imageEditOpen} onOpenChange={setImageEditOpen} />
    </>
  )
}
