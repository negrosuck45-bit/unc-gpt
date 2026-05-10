"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Square, Send, ImageIcon, Paperclip, Volume2, Loader2, X, PanelLeft, PanelLeftClose } from "lucide-react";
import { toast } from "sonner";
import { useChatStore, type Attachment } from "@/lib/chat-store";
import { truncateMemory } from "@/lib/memory-parsers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function detectLanguage(text: string): string {
  const lower = text.toLowerCase().trim();
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(text)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(text)) return "ko-KR";
  if (/[а-яё]/.test(lower)) return "ru-RU";
  if (/[α-ωά-ώ]/.test(text)) return "el-GR";
  if (lower.includes("ñ") || lower.match(/\b(el|la|que|en|por)\b/)) return "es-ES";
  if (lower.match(/\b(je|tu|il|nous|vous|bonjour)\b/)) return "fr-FR";
  if (lower.match(/\b(der|die|das|und|ist|ich|du)\b/)) return "de-DE";
  return "en-US";
}

const VOICE_MAP: Record<string, string> = {
  "en-US": "en-US-GuyNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "ja-JP": "ja-JP-NanamiNeural",
  "ko-KR": "ko-KR-SunHiNeural",
  "ru-RU": "ru-RU-SvetlanaNeural",
  "el-GR": "el-GR-AthinaNeural",
  "es-ES": "es-ES-ElviraNeural",
  "fr-FR": "fr-FR-DeniseNeural",
  "de-DE": "de-DE-KatjaNeural",
};

interface VoiceChatProps {
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function VoiceChat({ onOpenSidebar, isSidebarOpen }: VoiceChatProps = {}) {
  const {
    currentChatId,
    createNewChat,
    addMessage,
    updateMessage,
    deleteMessage,
    getCurrentChat,
    getProject,
    isStreaming,
    setIsStreaming,
    settings,
  } = useChatStore();

  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [textInput, setTextInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset status when switching chats
  useEffect(() => {
    setStatus("idle");
    setIsStreaming(false);
    setIsProcessing(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
  }, [currentChatId, setIsStreaming]);

  useEffect(() => {
    if (!currentChatId) createNewChat("voice", null, settings.model, settings.provider);
  }, [currentChatId, createNewChat, settings.model, settings.provider]);

  const currentChat = getCurrentChat();
  const messages = currentChat?.messages ?? [];
  const currentProject = getProject(currentChat?.projectId);

  useEffect(() => {
    const t = setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 80);
    return () => clearTimeout(t);
  }, [messages, status, isStreaming]);

  // ====================== SPEAK ======================
  const speak = useCallback(async (text: string) => {
    if (isSpeakingRef.current || !text) return;
    const cleanText = stripForSpeech(text);
    if (!cleanText) return;

    isSpeakingRef.current = true;
    setAiSpeaking(true);
    setStatus("speaking");

    const lang = detectLanguage(cleanText);
    const voice = VOICE_MAP[lang] ?? "en-US-GuyNeural";

    const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(cleanText)}`;

    const onDone = () => {
      setStatus("idle");
      setAiSpeaking(false);
      isSpeakingRef.current = false;
    };

    try {
      const audio = new Audio(ttsUrl);
      audioRef.current = audio;
      audio.onended = onDone;
      audio.onerror = (e) => {
        onDone();
      };
      await audio.play();
    } catch (e) {
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.onend = onDone;
        synth.speak(utterance);
      } catch (err) {
        onDone();
      }
    }
  }, []);

  // ====================== SEND MESSAGE ======================
  const handleSend = useCallback(async (content: string) => {
    const finalContent = content || textInput;
    if (!finalContent.trim() && attachments.length === 0) return;

    const chatId = currentChatId || createNewChat("voice", null, settings.model, settings.provider);

    addMessage(chatId, {
      role: "user",
      content: finalContent.trim(),
      attachments: attachments,
    });

    setTextInput("");
    setAttachments([]);
    setIsProcessing(true);
    setIsStreaming(true);
    setStatus("thinking");
    abortControllerRef.current = new AbortController();

    try {
      const freshChat = useChatStore.getState().chats.find((c) => c.id === chatId);
      const messagesToSend = freshChat?.messages || [];

      const selectedModel = freshChat?.model || settings.model;
      const selectedProvider = freshChat?.provider || settings.provider;

      const formattedMessages = messagesToSend.map((m: any) => {
        if (m.role === "user" && m.attachments && m.attachments.length > 0) {
          const contentParts: any[] = [{ type: "text", text: m.content || "" }];
          m.attachments.forEach((a: any) => {
            if (a.type === "image") {
              contentParts.push({ type: "image_url", image_url: { url: a.url } });
            } else if (a.type === "file" || a.type === "link") {
              contentParts[0].text += `\n\n[Attached ${a.type}: ${a.name}](${a.url})`;
            }
          });
          return { ...m, content: contentParts };
        }
        return m;
      });

      const payload: any = {
        messages: formattedMessages,
        preferredModel: selectedModel,
        preferredProvider: selectedProvider,
      };

      if (currentProject) {
        if (currentProject.instructions) payload.projectInstructions = currentProject.instructions;
        if (currentProject.memory) payload.projectMemory = truncateMemory(currentProject.memory, 4000);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) throw new Error("API failed");

      const reader = response.body!.getReader();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullContent += parsed.content;
              }
            } catch (e) { }
          }
        }
      }

      addMessage(chatId, { role: "assistant", content: fullContent });
      setIsStreaming(false);
      setIsProcessing(false);
      speak(fullContent);
    } catch (error: any) {
      if (error.name !== "AbortError") {
      }
      setIsStreaming(false);
      setIsProcessing(false);
      setStatus("idle");
    } finally {
      abortControllerRef.current = null;
    }
  }, [currentChatId, createNewChat, addMessage, setIsStreaming, settings, currentProject, attachments, speak, textInput]);

  // ====================== SPEECH RECOGNITION ======================
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };
    recognition.onerror = (event: any) => {
      setStatus("idle");
    };
    recognition.onend = () => {
      if (status === "listening") setStatus("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleSend, status]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus("idle");
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsStreaming(false);
    setIsProcessing(false);
    isSpeakingRef.current = false;
    setStatus("idle");
  }, [setIsStreaming]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          type,
          name: file.name,
          url: reader.result as string,
          size: file.size,
          mimeType: file.type,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-3 py-2.5 min-h-[48px]">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-8 w-8 shrink-0 hover:bg-accent/50 md:hidden"
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>
        )}
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">Voice Mode</span>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="max-w-2xl mx-auto space-y-4 w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Mic className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground max-w-xs">Tap the mic button below or type to begin</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xs lg:max-w-md px-4 py-3 rounded-lg",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          
          {status === "thinking" && (
            <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-muted text-foreground rounded-lg rounded-bl-none px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grok-Style Blue Animation Under Input */}
      <div className="px-4 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
        {/* Animated blue light effect - moves when AI speaks */}
        {aiSpeaking && (
          <div className="mb-4 h-1 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-4">
          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachments.map((a) => (
                <div key={a.id} className="relative group">
                  {a.type === 'image' ? (
                    <img src={a.url} alt="preview" className="h-12 w-12 rounded-md object-cover border border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-md border border-border flex items-center justify-center bg-muted">
                      <Paperclip className="h-4 w-4" />
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                    className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border border-border focus-within:border-primary/50 transition-colors">
            <div className="flex items-center gap-1 pb-1 pl-1">
              <input
                type="file"
                id="voice-image-upload"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => document.getElementById('voice-image-upload')?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <input
                type="file"
                id="voice-file-upload"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'file')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => document.getElementById('voice-file-upload')?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(textInput);
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-sm max-h-32 min-h-[40px]"
              rows={1}
            />

            <div className="pb-1 pr-1">
              {textInput.trim() || attachments.length > 0 ? (
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleSend(textInput)}
                  disabled={isStreaming}
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant={status === "listening" ? "destructive" : "default"}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-300",
                    status === "listening" && "animate-pulse scale-110"
                  )}
                  onClick={status === "listening" ? stopListening : startListening}
                >
                  {status === "listening" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
