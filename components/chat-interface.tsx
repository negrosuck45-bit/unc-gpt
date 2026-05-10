"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore, type Attachment } from "@/lib/chat-store";
import { truncateMemory } from "@/lib/memory-parsers";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { WelcomeScreen } from "@/components/welcome-screen";
import { ChatHeader } from "@/components/chat-header";

interface ChatInterfaceProps {
  onSwitchToImagine?: () => void;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function ChatInterface({ onSwitchToImagine, onOpenSidebar, isSidebarOpen }: ChatInterfaceProps) {
  const [mounted, setMounted] = useState(false);
  const [activeModelInfo, setActiveModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingAssistantIdRef = useRef<string | null>(null);

  const {
    currentChatId,
    createNewChat,
    addMessage,
    updateMessage,
    deleteMessage,
    updateChatTitle,
    isStreaming,
    streamingChatId,
    setIsStreaming,
    getIsStreamingForChat,
    getCurrentChat,
    settings,
    getProject,
  } = useChatStore();

  // Get streaming state for the current chat only
  const isCurrentChatStreaming = currentChatId ? getIsStreamingForChat(currentChatId) : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentChat = getCurrentChat();
  const currentProject = getProject(currentChat?.projectId);

  // ====================== REGENERATE ======================
  const handleRegenerate = useCallback(async (messageId: string) => {
    if (!currentChat || isCurrentChatStreaming) return;

    const chatId = currentChat.id;
    const messages = [...currentChat.messages];
    const assistantIndex = messages.findIndex((m) => m.id === messageId);

    if (assistantIndex === -1 || messages[assistantIndex].role !== "assistant") return;

    const userIndex = assistantIndex - 1;
    if (userIndex < 0 || messages[userIndex].role !== "user") return;

    deleteMessage(chatId, messageId);
    setIsStreaming(true, chatId);
    setIsThinking(true);
    abortControllerRef.current = new AbortController();

    try {
      const messagesToSend = messages.slice(0, assistantIndex);
      await processAIResponse(chatId, messagesToSend);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        addMessage(chatId, { role: "assistant", content: "Sorry, something went wrong." });
      }
    } finally {
      setIsStreaming(false);
      setIsThinking(false);
      abortControllerRef.current = null;
      pendingAssistantIdRef.current = null;
    }
  }, [currentChat, isCurrentChatStreaming, addMessage, deleteMessage, setIsStreaming]);

  // ====================== SEND MESSAGE ======================
  const handleSend = useCallback(async (content: string, attachments?: Attachment[]) => {
    if (!content?.trim() && (!attachments || attachments.length === 0)) return;

    const chatId = currentChatId || createNewChat("text", null, settings.model, settings.provider);
    
    addMessage(chatId, {
      role: "user",
      content: content.trim(),
      attachments: attachments || [],
    });

    const freshChat = useChatStore.getState().chats.find((c) => c.id === chatId);

    if (freshChat && freshChat.messages.length <= 1) {
      const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
      updateChatTitle(chatId, title);
    }

    setIsStreaming(true, chatId);
    setIsThinking(true);
    abortControllerRef.current = new AbortController();

    try {
      const messagesToSend = freshChat?.messages || [];
      await processAIResponse(chatId, messagesToSend);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        addMessage(chatId, { role: "assistant", content: "Sorry, something went wrong." });
      }
    } finally {
      setIsStreaming(false);
      setIsThinking(false);
      abortControllerRef.current = null;
      pendingAssistantIdRef.current = null;
    }
  }, [currentChatId, createNewChat, addMessage, updateChatTitle, setIsStreaming, settings]);

  // ====================== CORE AI RESPONSE HANDLER ======================
  const processAIResponse = async (chatId: string, messages: any[]) => {
    const currentChat = useChatStore.getState().chats.find(c => c.id === chatId);
    const selectedModel = currentChat?.model;
    const selectedProvider = currentChat?.provider;

    if (!selectedModel || !selectedProvider) {
      addMessage(chatId, { role: "assistant", content: "Error: Model not properly selected" });
      return;
    }

    setActiveModelInfo({ provider: selectedProvider, model: selectedModel });

    const project = getProject(currentChat?.projectId ?? null);

    const formattedMessages = messages.map((m: any) => {
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

    if (selectedProvider === "anthropic" && settings.anthropicApiKey) {
      payload.anthropicApiKey = settings.anthropicApiKey;
    }

    if (project) {
      if (project.instructions) payload.projectInstructions = project.instructions;
      if (project.memory) {
        payload.projectMemory = truncateMemory(project.memory, 6000);
      }
    }

    // MCP connectors (kept but can be removed later if not needed)
    try {
      const stored = localStorage.getItem("mcp-connectors");
      if (stored) {
        const connectors = JSON.parse(stored);
        const enabled = (connectors || []).filter((c: any) => c.enabled);
        if (enabled.length > 0) payload.mcpConnectors = enabled;
      }
    } catch {}

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const err = await response.json();
        if (err?.error) msg = err.error;
      } catch {}
      addMessage(chatId, { role: "assistant", content: `❌ ${msg}` });
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let fullContent = "";
    let assistantMsgId: string | null = null;
    let hasStartedStreaming = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = sseBuffer.indexOf("\n\n")) !== -1) {
        const event = sseBuffer.slice(0, boundary);
        sseBuffer = sseBuffer.slice(boundary + 2);

        for (const line of event.split("\n")) {
          if (!line.startsWith("data: ")) continue;

          const dataStr = line.slice(6).trim();
          if (dataStr === "" || dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.content) {
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                setIsThinking(false);
                assistantMsgId = addMessage(chatId, { role: "assistant", content: parsed.content });
                fullContent = parsed.content;
              } else {
                fullContent += parsed.content;
                if (assistantMsgId) {
                  updateMessage(chatId, assistantMsgId, fullContent);
                }
              }
            } 
            else if (parsed.image) {
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                setIsThinking(false);
                assistantMsgId = addMessage(chatId, { role: "assistant", content: fullContent });
              }
              if (assistantMsgId) updateMessage(chatId, assistantMsgId, fullContent, parsed.image);
            } 
            else if (parsed.video) {
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                setIsThinking(false);
                assistantMsgId = addMessage(chatId, { role: "assistant", content: fullContent });
              }
              if (assistantMsgId) updateMessage(chatId, assistantMsgId, fullContent, undefined, parsed.video);
            } 
            else if (parsed.provider && parsed.model) {
              setActiveModelInfo({ provider: parsed.provider, model: parsed.model });
              if (!hasStartedStreaming) setIsThinking(false);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <ChatHeader
        project={currentProject}
        chat={currentChat}
        activeModelInfo={activeModelInfo}
        onOpenSidebar={onOpenSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {!currentChat || currentChat.messages.length === 0 ? (
            <WelcomeScreen onSelectPrompt={(p) => handleSend(p)} project={currentProject} />
          ) : (
            <ChatMessages
              messages={currentChat.messages}
              isStreaming={isCurrentChatStreaming}
              isThinking={isThinking}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>
      </div>

      <div className="chat-input-footer w-full flex-shrink-0">
        <div className="px-3 pt-3 pb-2 max-w-4xl mx-auto w-full">
          <ChatInput
            onSend={handleSend}
            onStop={() => abortControllerRef.current?.abort()}
            isStreaming={isCurrentChatStreaming}
            disabled={isCurrentChatStreaming}
            key={currentChatId || 'new-chat'}
          />
        </div>
      </div>
    </div>
  );
}
