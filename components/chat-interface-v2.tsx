"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore, type Attachment } from "@/lib/chat-store";
import { truncateMemory } from "@/lib/memory-parsers";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInputV2 } from "@/components/chat-input-v2";
import { WelcomeScreen } from "@/components/welcome-screen";
import { ChatHeader } from "@/components/chat-header";
import { AlertCircle } from "lucide-react";

interface ChatInterfaceProps {
  onSwitchToImagine?: () => void;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, any>;
}

export function ChatInterface({ onSwitchToImagine, onOpenSidebar, isSidebarOpen }: ChatInterfaceProps) {
  const [mounted, setMounted] = useState(false);
  const [activeModelInfo, setActiveModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [toolExecuting, setToolExecuting] = useState<string | null>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentChatId,
    createNewChat,
    addMessage,
    updateMessage,
    deleteMessage,
    updateChatTitle,
    isStreaming,
    setIsStreaming,
    getCurrentChat,
    settings,
    getProject,
  } = useChatStore();

  useEffect(() => {
    setMounted(true);
    loadMCPTools();
  }, []);

  const loadMCPTools = async () => {
    try {
      const tools = await listMCPTools();
      setMcpTools(tools);
    } catch (error) {
      console.error("Failed to load MCP tools:", error);
    }
  };

  const currentChat = getCurrentChat();
  const currentProject = getProject(currentChat?.projectId);

  // ===== HANDLE TOOL EXECUTION =====
  const handleToolExecution = useCallback(
    async (toolUseBlock: ToolUseBlock, chatId: string, messages: any[]) => {
      setToolExecuting(toolUseBlock.id);

      try {
        // Execute the MCP tool
        const [serverName, toolName] = toolUseBlock.name.split(":");
        const result = await executeMCPTool(serverName, toolName, toolUseBlock.input);

        // Add tool result to messages
        const toolResultMessage = {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: result,
            },
          ],
        };

        // Continue the conversation with the tool result
        await processAIResponse(chatId, [...messages, toolResultMessage]);
      } catch (error) {
        addMessage(chatId, {
          role: "assistant",
          content: `❌ Tool execution failed: ${(error as any).message}`,
        });
      } finally {
        setToolExecuting(null);
      }
    },
    [addMessage]
  );

  // ===== SEND MESSAGE =====
  const handleSend = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!content?.trim() && (!attachments || attachments.length === 0)) return;

      const chatId = currentChatId || createNewChat("text", null, settings.model, settings.provider);
      const targetChat = useChatStore.getState().chats.find((c) => c.id === chatId);
      if (!targetChat) return;

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

      setIsStreaming(true);
      setIsThinking(true);
      abortControllerRef.current = new AbortController();

      try {
        const messagesToSend = freshChat?.messages || [];
        await processAIResponse(chatId, messagesToSend);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Chat error:", error);
        }
      } finally {
        setIsStreaming(false);
        setIsThinking(false);
        abortControllerRef.current = null;
      }
    },
    [currentChatId, createNewChat, addMessage, updateChatTitle, setIsStreaming, settings]
  );

  // ===== CORE AI RESPONSE HANDLER WITH MCP SUPPORT =====
  const processAIResponse = async (chatId: string, messages: any[]) => {
    const currentChat = useChatStore.getState().chats.find((c) => c.id === chatId);
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
            contentParts.push({
              type: "image_url",
              image_url: { url: a.url },
            });
          } else if (a.type === "file" || a.type === "link" || a.type === "video") {
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
      enableMCP: mcpTools.length > 0,
      mcpTools: mcpTools,
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
    let toolUseBlocks: ToolUseBlock[] = [];

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

            // Handle text content
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
            // Handle tool_use blocks
            else if (parsed.tool_use) {
              toolUseBlocks.push(parsed.tool_use);
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                setIsThinking(false);
                assistantMsgId = addMessage(chatId, { role: "assistant", content: fullContent });
              }
            }
            // Handle images
            else if (parsed.image) {
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                setIsThinking(false);
                assistantMsgId = addMessage(chatId, { role: "assistant", content: fullContent });
              }
              if (assistantMsgId) {
                updateMessage(chatId, assistantMsgId, fullContent, parsed.image);
              }
            }
            // Handle provider/model info
            else if (parsed.provider && parsed.model) {
              setActiveModelInfo({ provider: parsed.provider, model: parsed.model });
              if (!hasStartedStreaming) {
                setIsThinking(false);
              }
              if (assistantMsgId) {
                updateMessage(chatId, assistantMsgId, fullContent, undefined, undefined, parsed.model);
              }
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    }

    // Handle any tool_use blocks that were collected
    if (toolUseBlocks.length > 0 && assistantMsgId) {
      for (const toolBlock of toolUseBlocks) {
        addMessage(chatId, {
          role: "assistant",
          content: `🔧 Executing: ${toolBlock.name}`,
        });
        await handleToolExecution(toolBlock, chatId, [...messages]);
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <ChatHeader
        project={currentProject}
        chat={currentChat}
        activeModelInfo={activeModelInfo}
        onOpenSidebar={onOpenSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          className="flex-1 overflow-y-auto scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch", willChange: "scroll-position" } as React.CSSProperties}
        >
          {!currentChat || currentChat.messages.length === 0 ? (
            <WelcomeScreen
              onSelectPrompt={(p) => handleSend(p)}
              project={currentProject}
            />
          ) : (
            <ChatMessages
              messages={currentChat.messages}
              isStreaming={isStreaming}
              isThinking={isThinking}
              onRegenerate={() => {}}
            />
          )}
        </div>
      </div>

      {/* Input Footer */}
      <div className="chat-input-footer w-full flex-shrink-0">
        <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto w-full">
          {toolExecuting && (
            <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin">⚙️</div>
              Executing tool...
            </div>
          )}
          <ChatInputV2
            onSend={handleSend}
            onStop={() => abortControllerRef.current?.abort()}
            isStreaming={isStreaming}
            disabled={isStreaming || toolExecuting !== null}
          />
        </div>
      </div>
    </div>
  );
}
