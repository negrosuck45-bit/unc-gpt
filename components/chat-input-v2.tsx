'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ArrowUp, 
  Plus, 
  Paperclip, 
  Square, 
  Sparkles,
  Code2, 
  Plug,
  Link,
  Cloud,
  Github,
  Database,
  MessageSquare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Attachment } from '@/lib/chat-store'

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

interface MCPTool {
  name: string
  description: string
  server: string
}

// Example prompts that highlight MCP capabilities
const MCP_EXAMPLE_PROMPTS = [
  {
    icon: Github,
    title: "Create GitHub Repo",
    prompt: "Create a GitHub repository called my-awesome-project",
    category: "github"
  },
  {
    icon: Code2,
    title: "Generate Code",
    prompt: "Create a React component for a todo list",
    category: "coding"
  },
  {
    icon: Database,
    title: "Query Database",
    prompt: "Show me the top 10 users by signup date",
    category: "database"
  },
  {
    icon: Sparkles,
    title: "Explain Concept",
    prompt: "Explain Model Context Protocol and why it matters",
    category: "explain"
  },
]

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([])
  const [showExamples, setShowExamples] = useState(false)
  const [showConnectors, setShowConnectors] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [rows, setRows] = useState(1)

  // Load MCP tools on mount
  useEffect(() => {
    loadMCPTools()
  }, [])

  const loadMCPTools = async () => {
    try {
      const tools = await listMCPTools()
      setMcpTools(tools)
    } catch (error) {
      console.error('Failed to load MCP tools:', error)
    }
  }

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = Math.min(textareaRef.current.scrollHeight, 200)
      textareaRef.current.style.height = `${scrollHeight}px`
      
      const newRows = Math.max(1, Math.min(5, Math.ceil(scrollHeight / 24)))
      setRows(newRows)
    }
  }, [input])

  const handleSend = useCallback(() => {
    if (!input.trim() || disabled || isStreaming) return

    onSend(input.trim())
    setInput('')
    setShowExamples(false)
    setShowConnectors(false)
    setRows(1)
  }, [input, disabled, isStreaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleExampleClick = (prompt: string) => {
    setInput(prompt)
    setShowExamples(false)
    // Auto-focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const getToolIcon = (server: string) => {
    switch (server.toLowerCase()) {
      case 'github':
        return <Github className="h-4 w-4" />
      case 'database':
      case 'postgres':
      case 'supabase':
        return <Database className="h-4 w-4" />
      default:
        return <Code2 className="h-4 w-4" />
    }
  }

  const canExecuteTools = mcpTools.length > 0

  return (
    <div className="w-full space-y-3">
      {/* MCP Tools Status Bar */}
      {canExecuteTools && !isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2"
        >
          <Sparkles className="h-3 w-3 text-purple-500" />
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{mcpTools.length} tools available</span>
            {' '} — Ask to create repos, manage issues, query databases...
          </span>
        </motion.div>
      )}

      {/* Main Input Area */}
      <div className="relative bg-background border border-border rounded-2xl shadow-sm transition-all hover:border-foreground/50 focus-within:border-foreground/80 focus-within:shadow-md">
        
        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowExamples(true)}
          placeholder="Message Claude... (Shift+Enter for new line)"
          disabled={disabled || isStreaming}
          rows={rows}
          className={cn(
            "w-full px-4 pt-4 pb-12 resize-none bg-transparent text-base outline-none placeholder-muted-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "font-normal leading-relaxed"
          )}
        />

        {/* Bottom Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between border-t border-border/50 bg-gradient-to-t from-background via-background to-transparent">
          
          {/* Left: Attachment button */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Attachment logic handled by parent
              }}
              disabled={disabled || isStreaming}
              className="rounded-lg hover:bg-muted"
              title="Attach files or images"
            >
              <Plus className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowConnectors(!showConnectors)
                setShowExamples(false)
              }}
              disabled={disabled || isStreaming}
              className={cn(
                "rounded-lg hover:bg-muted transition-colors",
                showConnectors && "bg-purple-500/10 text-purple-500"
              )}
              title="MCP Connectors"
            >
              <Plug className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: Send/Stop Button */}
          {isStreaming ? (
            <Button
              size="sm"
              onClick={onStop}
              variant="destructive"
              className="rounded-lg gap-2"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={cn(
                "rounded-lg gap-2 transition-all",
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="h-4 w-4" />
              Send
            </Button>
          )}
        </div>
      </div>

      {/* MCP Connector Quick List */}
      <AnimatePresence>
        {showConnectors && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-background border border-border rounded-xl shadow-lg space-y-2"
          >
            <div className="text-xs font-semibold text-muted-foreground px-1 flex items-center justify-between">
              <span>Connect Agentic Tools</span>
              <span className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded">Redirect Auth</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'github', name: 'GitHub', icon: Github },
                { id: 'vercel', name: 'Vercel', icon: Link },
                { id: 'supabase', name: 'Supabase', icon: Database },
                { id: 'notion', name: 'Notion', icon: MessageSquare },
                { id: 'google_drive', name: 'G-Drive', icon: Cloud },
                { id: 'slack', name: 'Slack', icon: MessageSquare },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => window.location.href = `/api/mcp/oauth/${p.id}/start`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 text-sm transition-all"
                >
                  <p.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground px-1 italic">
              Clicking a connector will redirect you to allow permissions for the AI.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Prompts & MCP Tools Panel */}
      <AnimatePresence>
        {showExamples && !input.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Example Prompts */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                Try asking about:
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {MCP_EXAMPLE_PROMPTS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.prompt}
                      onClick={() => handleExampleClick(item.prompt)}
                      className="group text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-border transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground group-hover:text-foreground">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 group-hover:text-muted-foreground">
                            {item.prompt}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Available MCP Tools */}
            {canExecuteTools && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                  Connected Tools:
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {mcpTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="p-2 rounded-lg bg-muted/20 border border-border/30 hover:border-border/60 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        {getToolIcon(tool.server)}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-foreground/70">
                            {tool.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {tool.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">💡 Tip:</span> Ask Claude to create 
              repositories, manage issues, update files, query databases, and more using connected MCP tools.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Help Text */}
      {!isStreaming && (
        <div className="text-xs text-center text-muted-foreground px-4">
          Press <span className="font-mono bg-muted px-1.5 py-0.5 rounded">Shift+Enter</span> for new line • 
          {' '}<span className="font-mono bg-muted px-1.5 py-0.5 rounded">Ctrl+Enter</span> to send
        </div>
      )}
    </div>
  )
}
