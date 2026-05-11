'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  ArrowUp,
  Square,
  Paperclip,
  ImageIcon,
  X,
  FileText,
  File as FileIcon,
  AudioWaveform,
  Eye,
  Plus,
  ChevronDown,
  Globe,
  Sparkles,
  Lock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Attachment, useChatStore, MODELS, type ModelInfo } from '@/lib/chat-store'
import { uploadFile } from '@/lib/upload'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Image from 'next/image'

// ====================== FAMILY ICONS ======================
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

// ---------- Helpers ----------
function toBase64(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function fromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > h) { if (w > 1200) { h = Math.round((h * 1200) / w); w = 1200 } }
        else { if (h > 1200) { w = Math.round((w * 1200) / h); h = 1200 } }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function useIsDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  initialValue?: string
  onClearInitialValue?: () => void
  onVoiceMessageSent?: () => void
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  initialValue,
  onClearInitialValue,
  onVoiceMessageSent,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set())
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const voiceSentRef = useRef(false)
  const uploadQueueRef = useRef<Set<string>>(new Set())

  // Refs to avoid stale closures in recognition events
  const inputRef = useRef(input)
  inputRef.current = input
  const handleSubmitRef = useRef(() => {})
  // will be assigned later

  const { settings, updateSettings, getCurrentChat, updateChatModel } = useChatStore()
  const currentChat = getCurrentChat()
  const isDark = useIsDarkMode()

  // ---------- Model locking ----------
  const isLocked = !!currentChat && currentChat.messages.length > 0

  const currentModel = useMemo(() => {
    const val = currentChat?.model || settings.model
    return MODELS.find((m) => m.value === val) || MODELS[0]
  }, [currentChat?.model, settings.model])

  const modelsByFamily = useMemo(() => {
    const groups: { [key: string]: ModelInfo[] } = {}
    MODELS.forEach((m) => {
      if (!groups[m.family]) groups[m.family] = []
      groups[m.family].push(m)
    })
    return groups
  }, [])

  const handleModelChange = (model: ModelInfo) => {
    if (isLocked) return
    updateSettings({ model: model.value, provider: model.provider })
    if (currentChat) updateChatModel(currentChat.id, model.value, model.provider)
  }

  // ---------- Model Icon (image with fallback) ----------
  function ModelIcon({ family }: { family: string }) {
    if (family === 'auto') return <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
    const src = familyIcons[family]
    if (src && !iconErrors.has(family)) {
      return (
        <Image
          src={src}
          alt={family}
          width={16}
          height={16}
          className="h-4 w-4 shrink-0"
          onError={() => setIconErrors((prev) => new Set([...prev, family]))}
        />
      )
    }
    const colorMap: Record<string, string> = { c: 'text-orange-500', l: 'text-blue-500', q: 'text-purple-500', d: 'text-cyan-500', g: 'text-green-500', k: 'text-yellow-500' }
    return <span className={cn('h-4 w-4 text-xs font-bold flex items-center justify-center', colorMap[family[0]] || 'text-muted-foreground')}>{family[0].toUpperCase()}</span>
  }

  // ---------- Paste / Upload ----------
  const detectCodeBlock = useCallback((text: string) => {
    const m = text.match(/^```(\w*)\n([\s\S]*?)\n```$/)
    return m ? { isCode: true, code: m[2], language: m[1] || 'text' } : { isCode: false, code: '', language: '' }
  }, [])

  const detectDocument = useCallback((text: string): { isDocument: boolean; title: string } => {
    try { JSON.parse(text); return { isDocument: true, title: 'JSON Document' } } catch {}
    if (/^[\w-]+:\s+/m.test(text)) return { isDocument: true, title: 'Configuration File' }
    if (/^#{1,6}\s+/m.test(text)) return { isDocument: true, title: 'Markdown Document' }
    if (/<[a-z][\s\S]*>/i.test(text)) return { isDocument: true, title: 'HTML Document' }
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/i.test(text)) return { isDocument: true, title: 'SQL Document' }
    return { isDocument: false, title: '' }
  }, [])

  const handlePaste = useCallback((text: string) => {
    const trimmed = text.trim()
    const code = detectCodeBlock(trimmed)
    if (code.isCode) {
      return {
        content: '',
        attachments: [{
          id: crypto.randomUUID(), type: 'file' as const,
          name: `code.${code.language}`,
          url: `data:text/plain;base64,${toBase64(code.code)}`,
          mimeType: 'text/plain', size: code.code.length, language: code.language,
        }],
      }
    }
    const doc = detectDocument(trimmed)
    if (doc.isDocument) {
      let lang = 'text'
      if (doc.title === 'JSON Document') lang = 'json'
      else if (doc.title === 'HTML Document') lang = 'html'
      else if (doc.title === 'SQL Document') lang = 'sql'
      else if (doc.title === 'Markdown Document') lang = 'markdown'
      else if (doc.title === 'Configuration File') lang = 'yaml'
      return {
        content: '',
        attachments: [{
          id: crypto.randomUUID(), type: 'file' as const,
          name: doc.title,
          url: `data:text/plain;base64,${toBase64(trimmed)}`,
          mimeType: 'text/plain', size: trimmed.length, language: lang,
        }],
      }
    }
    return { content: text, attachments: [] }
  }, [detectCodeBlock, detectDocument])

  const uploadImageAsync = useCallback(async (file: File, pid: string) => {
    try {
      uploadQueueRef.current.add(pid)
      setIsUploading(true)
      const compressed = await compressImage(file)
      const { url } = await uploadFile(new File([compressed], file.name, { type: 'image/jpeg' }), { folder: 'images' })
      setAttachments((prev) => prev.map((a) => (a.id === pid ? { ...a, url } : a)))
    } catch (e) {
      console.error(e)
    } finally {
      uploadQueueRef.current.delete(pid)
      if (uploadQueueRef.current.size === 0) setIsUploading(false)
    }
  }, [])

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const images = items.filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
    if (images.length > 0) {
      e.preventDefault()
      images.forEach((it) => {
        const file = it.getAsFile()
        if (!file) return
        const id = crypto.randomUUID()
        setAttachments((prev) => [...prev, {
          id, type: 'image', name: file.name, url: URL.createObjectURL(file), size: file.size, mimeType: file.type,
        }])
        uploadImageAsync(file, id)
      })
      return
    }
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    const { content, attachments: atts } = handlePaste(text)
    if (atts.length > 0) {
      e.preventDefault()
      setAttachments((prev) => [...prev, ...atts])
      if (content) setInput((prev) => prev + content)
    }
  }

  // Auto‑resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  useEffect(() => {
    if (initialValue) { setInput(initialValue); onClearInitialValue?.() }
  }, [initialValue])

  // ---------- Voice recognition (fixed) ----------
  const handleSubmit = useCallback(() => {
    if ((input.trim() || attachments.length > 0) && !isStreaming && !disabled) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined)
      setInput('')
      setAttachments([])
    }
  }, [input, attachments, isStreaming, disabled, onSend])

  // Keep latest submit handler in a ref so recognition can call it without stale closure
  handleSubmitRef.current = handleSubmit

  // Set up recognition once, independent of input changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => {
      setIsRecording(true)
      voiceSentRef.current = false
    }

    rec.onresult = (ev: any) => {
      let final = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript
      }
      if (final) {
        // Use the functional updater to always get the latest input
        setInput((prev) => (prev.trim() ? prev + ' ' + final : final))
      }
    }

    rec.onend = () => {
      setIsRecording(false)
      // Auto‑send if something was spoken
      const currentInput = inputRef.current.trim()
      if (currentInput && !voiceSentRef.current) {
        voiceSentRef.current = true
        onVoiceMessageSent?.()
        handleSubmitRef.current()
      }
    }

    rec.onerror = () => setIsRecording(false)

    recognitionRef.current = rec
    return () => { rec.abort() }
  }, []) // <-- empty array: run once on mount

  const toggleVoiceInput = async () => {
    const rec = recognitionRef.current
    if (!rec) {
      alert('Speech recognition not supported.')
      return
    }
    if (isRecording) {
      rec.stop()
      return
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      rec.start()
    } catch {
      alert('Microphone access denied')
    }
  }

  // ---------- File & link handlers ----------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    files.forEach((file) => {
      const id = crypto.randomUUID()
      setAttachments((prev) => [...prev, {
        id, type, name: file.name,
        url: type === 'image' ? URL.createObjectURL(file) : '',
        size: file.size, mimeType: file.type,
      }])
      if (type === 'image') uploadImageAsync(file, id)
    })
    setAttachMenuOpen(false)
  }

  const handleAddLink = () => {
    if (!linkUrl.trim()) return
    const url = linkUrl.startsWith('http') ? linkUrl : 'https://' + linkUrl
    setAttachments((prev) => [...prev, { id: crypto.randomUUID(), type: 'link', name: url, url }])
    setLinkUrl(''); setShowLinkInput(false)
  }

  const removeAttachment = (id: string) => { setAttachments((prev) => prev.filter((a) => a.id !== id)); setViewingAttachment(null) }

  const imageAttachments = attachments.filter((a) => a.type === 'image')
  const otherAttachments = attachments.filter((a) => a.type !== 'image')

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-background">
      <div className="max-w-3xl mx-auto w-full px-0 pb-1">
        {/* Attachments preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 px-3 space-y-2 max-h-56 overflow-y-auto">
              {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imageAttachments.map((att) => (
                    <div key={att.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {otherAttachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg group">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1 text-sm">{att.name}</span>
                  <button onClick={() => setViewingAttachment(att)} className="p-1 hover:bg-accent rounded"><Eye className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-destructive/10 rounded"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input */}
        <div className="px-3">
          <div className="rounded-2xl border border-border bg-muted/30 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePasteEvent}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              className="w-full bg-transparent px-4 pt-3 pb-2 resize-none focus:outline-none min-h-[52px]"
              disabled={isStreaming || disabled || isUploading}
              rows={1}
            />

            <div className="flex items-center justify-between px-2 pb-2">
              {/* Attach */}
              <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" disabled={isStreaming || disabled}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1">
                  <button onClick={() => imageInputRef.current?.click()} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"><ImageIcon className="h-4 w-4" /> Images</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"><Paperclip className="h-4 w-4" /> Files</button>
                  <button onClick={() => { setShowLinkInput(true); setAttachMenuOpen(false) }} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"><Globe className="h-4 w-4" /> Link</button>
                  <div className="my-1 border-t border-border" />
                  <div className="px-3 py-1 text-xs text-muted-foreground font-medium">Integrations</div>
                  {[
                    { name: 'github', label: 'GitHub', icon: '🐙' },
                    { name: 'linear', label: 'Linear', icon: '📋' },
                    { name: 'slack', label: 'Slack', icon: '💬' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { window.location.href = `/api/mcp/oauth/${p.name}/start`; setAttachMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm"
                    >
                      <span>{p.icon}</span> Connect {p.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Right side */}
              <div className="flex items-center gap-1">
                {/* Model selector – LOCKED when chat has messages */}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild disabled={isStreaming || isLocked}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("gap-1.5 h-8 px-2", isLocked && "opacity-70 cursor-not-allowed")}
                            disabled={isStreaming || isLocked}
                          >
                            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            <ModelIcon family={currentModel.family} />
                            <span className="text-xs">{currentModel.label}</span>
                            {!isLocked && <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      {isLocked && (
                        <TooltipContent side="bottom">
                          <p className="text-xs">Create a new chat to change models.</p>
                        </TooltipContent>
                      )}
                      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                        {Object.entries(modelsByFamily).map(([family, models]) => (
                          <div key={family}>
                            <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                              {family === 'auto' ? 'Automatic' : family}
                            </DropdownMenuLabel>
                            {models.map((model) => (
                              <DropdownMenuItem
                                key={model.value}
                                onClick={() => handleModelChange(model)}
                                className={cn("flex items-center gap-2", currentModel.value === model.value && "bg-accent")}
                              >
                                <ModelIcon family={model.family} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{model.label}</div>
                                  <div className="text-xs text-muted-foreground truncate">{model.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Tooltip>
                </TooltipProvider>

                {/* Voice / Send / Stop */}
                {isStreaming ? (
                  <Button onClick={onStop} size="icon" variant="destructive" className="h-9 w-9 rounded-full"><Square className="h-4 w-4" /></Button>
                ) : (
                  <>
                    {!input.trim() && attachments.length === 0 ? (
                      <Button
                        onClick={toggleVoiceInput}
                        size="icon"
                        variant={isRecording ? "destructive" : "ghost"}
                        className="h-8 w-8 rounded-full"
                        title="Voice input"
                      >
                        <AudioWaveform className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isUploading || isStreaming || disabled} 
                        size="icon" 
                        className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        title={isUploading ? 'Uploading file...' : 'Send message'}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Link popup */}
        <AnimatePresence>
          {showLinkInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 px-3 flex gap-2">
              <input autoFocus className="flex-1 px-4 py-2 rounded-lg border border-border bg-background" placeholder="Paste URL..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLink()} />
              <Button onClick={handleAddLink}>Add</Button>
              <Button variant="ghost" onClick={() => setShowLinkInput(false)}>Cancel</Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e, 'file')} />
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />

        {/* Attachment viewer */}
        <Dialog open={!!viewingAttachment} onOpenChange={(open) => !open && setViewingAttachment(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{viewingAttachment?.name}</DialogTitle>
              <DialogDescription className="text-xs">{viewingAttachment?.size ? `${(viewingAttachment.size / 1024).toFixed(1)} KB` : ''}</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto mt-4 rounded-lg border border-border">
              {viewingAttachment?.language ? (
                <SyntaxHighlighter language={viewingAttachment.language} style={isDark ? oneDark : oneLight} showLineNumbers customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                  {fromBase64(viewingAttachment.url.split(',')[1])}
                </SyntaxHighlighter>
              ) : (
                <pre className="p-4 text-sm whitespace-pre-wrap">{viewingAttachment?.url}</pre>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}