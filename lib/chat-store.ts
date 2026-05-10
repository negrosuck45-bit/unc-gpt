import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSafeStorage, isBigDataUrl } from "./storage-offload";
import { uploadDataUrl } from "./upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Attachment {
  id: string;
  type: "image" | "video" | "file" | "link";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  language?: string;   // <-- Added for syntax highlighting
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  image?: string;   // base64 data URL for generated images
  video?: string;   // base64 data URL for generated videos
  modelUsed?: string; // model actually used for this message
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  type: "text" | "voice";
  messages: Message[];
  createdAt: Date;
  projectId?: string | null;
  model?: string;
  provider?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  memory?: string;
  memoryEntries?: any[]; // MemoryEntry[] from memory-system.ts
  memoryMetadata?: {
    totalEntries: number;
    lastUpdated: Date;
    characterCount: number;
  };
  createdAt: Date;
}

export type Provider = "cloudflare" | "groq" | "puter" | "auto" | "anthropic";
export type ModelFamily = "auto" | "claude" | "llama" | "qwen" | "kiwi" | "deepseek" | "gemma" | "glm" | "gpt-oss";
export type ModelIcon = "auto" | "claude" | "llama" | "qwen" | "kiwi" | "deepseek" | "gemma" | "glm" | "gpt-oss";

export interface Settings {
  provider: Provider;
  model: string;
  anthropicApiKey?: string;
}

export interface ModelInfo {
  value: string;
  label: string;
  provider: Provider;
  family: ModelFamily;
  free: boolean;
  description: string;
  icon: ModelIcon;
}

// ====================== MODEL DEFINITIONS ======================
export const MODELS: ModelInfo[] = [
  // ============ AUTO MODE (Top Priority) ============
  {
    value: "auto",
    label: " Auto ",
    provider: "auto",
    family: "auto",
    free: true,
    description: "Automatically selects the best model for your task",
    icon: "auto",
  },

  // ============ DEEPSEEK MODELS (Cloudflare) - NEW ============
  {
    value: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    label: "DeepSeek R1 32B",
    provider: "cloudflare",
    family: "deepseek",
    free: true,
    description: "Reasoning model distilled from DeepSeek-R1, excellent for logic",
    icon: "deepseek",
  },

  // ============ QWEN MODELS (Cloudflare) - UPDATED ============
  {
    value: "@cf/qwen/qwq-32b",
    label: "QwQ 32B",
    provider: "cloudflare",
    family: "qwen",
    free: true,
    description: "Experimental reasoning model with advanced thinking capabilities",
    icon: "qwen",
  },
  {
    value: "@cf/qwen/qwen2.5-coder-32b-instruct",
    label: "Qwen 2.5 Coder",
    provider: "cloudflare",
    family: "qwen",
    free: true,
    description: "Specialized model for high-performance coding and technical tasks",
    icon: "qwen",
  },
  {
    value: "@cf/qwen/qwen3-30b-a3b-fp8",
    label: "Qwen 3.6",
    provider: "cloudflare",
    family: "qwen",
    free: true,
    description: "Latest Qwen 3.6 model for agentic coding and thinking",
    icon: "qwen",
  },
  {
    value: "@cf/qwen/qwen1.5-14b-chat-awq",
    label: "Qwen 1.5",
    provider: "cloudflare",
    family: "qwen",
    free: true,
    description: "Efficient and capable general-purpose Qwen model",
    icon: "qwen",
  },

  // ============ GEMMA MODELS (Cloudflare) - NEW ============
  {
    value: "@cf/google/gemma-4-26b-a4b-it",
    label: "Gemma 4 26B",
    provider: "cloudflare",
    family: "gemma",
    free: true,
    description: "Google's latest lightweight open model with strong reasoning",
    icon: "gemma",
  },

  // ============ GPT-OSS MODELS (Cloudflare) - NEW ============
  {
    value: "@cf/a-lab/gpt-oss-120b",
    label: "GPT-OSS 120B",
    provider: "cloudflare",
    family: "gpt-oss",
    free: true,
    description: "Massive open-source scale model for complex tasks",
    icon: "gpt-oss",
  },

  // ============ GLM MODELS (Cloudflare) - NEW ============
  {
    value: "@cf/zhipuai/glm-4.7-flash",
    label: "GLM 4.7 Flash",
    provider: "cloudflare",
    family: "glm",
    free: true,
    description: "Fast and efficient model with excellent bilingual capabilities",
    icon: "glm",
  },

  // ============ KIWI MODELS (Cloudflare - Moonshot AI) - FEATURED ============
  {
    value: "@cf/moonshot/kimi-k2.6",
    label: "Kimi K2.6",
    provider: "cloudflare",
    family: "kiwi",
    free: true,
    description: "Latest 1T parameter model with superior reasoning & vision",
    icon: "kiwi",
  },
  {
    value: "@cf/moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    provider: "cloudflare",
    family: "kiwi",
    free: true,
    description: "Frontier-scale model with multi-turn tool calling & vision",
    icon: "kiwi",
  },

  // ============ CLAUDE MODELS (Cloudflare) ============
  {
    value: "@cf/anthropic/claude-3-opus",
    label: "Claude 3 Opus",
    provider: "cloudflare",
    family: "claude",
    free: true,
    description: "Most powerful and intelligent model in the Claude 3 family",
    icon: "claude",
  },
  {
    value: "@cf/anthropic/claude-3-sonnet",
    label: "Claude 3 Sonnet",
    provider: "cloudflare",
    family: "claude",
    free: true,
    description: "Offers a balance between intelligence and speed",
    icon: "claude",
  },
  {
    value: "@cf/anthropic/claude-3-haiku",
    label: "Claude 3 Haiku",
    provider: "cloudflare",
    family: "claude",
    free: true,
    description: "Fastest and most compact model in the Claude 3 family",
    icon: "claude",
  },

  // ============ LLAMA MODELS (Groq) ============
  {
    value: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "groq",
    family: "llama",
    free: true,
    description: "Best for general tasks, fast & uncensored",
    icon: "llama",
  },
  {
    value: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B",
    provider: "groq",
    family: "llama",
    free: true,
    description: "Fastest responses, lightweight tasks",
    icon: "llama",
  },
  {
    value: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B",
    provider: "groq",
    family: "llama",
    free: true,
    description: "Vision-capable, great for images + text",
    icon: "llama",
  },
];

// Helper functions for model grouping
export function getModelsByFamily(family: ModelFamily): ModelInfo[] {
  return MODELS.filter((m) => m.family === family);
}

export function getModelsByProvider(provider: Provider): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getModelFamilies(): ModelFamily[] {
  const families = new Set<ModelFamily>();
  MODELS.forEach((m) => families.add(m.family));
  return Array.from(families).sort((a, b) => {
    // Auto first, then alphabetical
    if (a === "auto") return -1;
    if (b === "auto") return 1;
    return a.localeCompare(b);
  });
}

interface ChatStore {
  chats: Chat[];
  projects: Project[];
  currentChatId: string | null;
  currentProjectId: string | null;
  isStreaming: boolean;
  streamingChatId: string | null; // Track which chat is streaming
  settings: Settings;
  // chats
  setCurrentChat: (id: string | null) => void;
  createNewChat: (type?: "text" | "voice", projectId?: string | null, model?: string, provider?: string) => string;
  addMessage: (chatId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (chatId: string, messageId: string, content: string, image?: string, video?: string, modelUsed?: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  updateChatProject: (chatId: string, projectId: string | null) => void;
  updateChatModel: (chatId: string, model: string, provider: string) => void;
  deleteChat: (chatId: string) => void;
  setIsStreaming: (isStreaming: boolean, chatId?: string | null) => void;
  getIsStreamingForChat: (chatId: string | null) => boolean;
  getCurrentChat: () => Chat | null;
  getChatsByType: (type: "text" | "voice") => Chat[];
  clearAllChats: () => void;
  // projects
  setCurrentProject: (id: string | null) => void;
  createProject: (data: { name: string; description?: string; instructions?: string; memory?: string }) => string;
  updateProject: (id: string, data: Partial<Omit<Project, "id" | "createdAt">>) => void;
  deleteProject: (id: string) => void;
  appendToProjectMemory: (id: string, chunk: string) => void;
  getProject: (id: string | null | undefined) => Project | null;
  exportProjectMemory: (id: string) => string;
  // settings
  updateSettings: (partial: Partial<Settings>) => void;
}

// Background helper: when a message contains a big base64 data URL,
// upload it to Supabase Storage and rewrite the in-memory state to use the
// resulting public URL. Keeps localStorage tiny on iOS.
function offloadMessageMedia(
  chatId: string,
  messageId: string,
  set: (fn: (s: any) => any) => void,
) {
  const state = useChatStore.getState();
  const chat = state.chats.find((c) => c.id === chatId);
  const msg = chat?.messages.find((m) => m.id === messageId);
  if (!msg) return;

  const jobs: Promise<{ field: "image" | "video" | "attachment"; url: string; attId?: string }>[] = [];

  if (isBigDataUrl(msg.image)) {
    jobs.push(uploadDataUrl(msg.image as string, { folder: "generated" })
      .then((r) => ({ field: "image" as const, url: r.url })));
  }
  if (isBigDataUrl(msg.video)) {
    jobs.push(uploadDataUrl(msg.video as string, { folder: "generated" })
      .then((r) => ({ field: "video" as const, url: r.url })));
  }
  msg.attachments?.forEach((att) => {
    if (isBigDataUrl(att.url)) {
      jobs.push(uploadDataUrl(att.url, { folder: "attachments" })
        .then((r) => ({ field: "attachment" as const, url: r.url, attId: att.id })));
    }
  });

  if (jobs.length === 0) return;

  Promise.all(jobs).then((results) => {
    set((s: any) => ({
      chats: s.chats.map((c: Chat) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m;
                let next = { ...m };
                for (const r of results) {
                  if (!r.url) continue;
                  if (r.field === "image") next.image = r.url;
                  else if (r.field === "video") next.video = r.url;
                  else if (r.field === "attachment" && r.attId) {
                    next.attachments = next.attachments?.map((a) =>
                      a.id === r.attId ? { ...a, url: r.url } : a,
                    );
                  }
                }
                return next;
              }),
            },
      ),
    }));
  }).catch(() => { /* keep base64 fallback on failure */ });
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      projects: [],
      currentChatId: null,
      currentProjectId: null,
      isStreaming: false,
      streamingChatId: null,
      settings: {
        provider: "auto",
        model: "auto",
      },
      setCurrentChat: (id) => set({ currentChatId: id }),
      createNewChat: (type = "text", projectId, model, provider) => {
        const newChat: Chat = {
          id: crypto.randomUUID(),
          title: type === "voice" ? "Voice Conversation" : "New Chat",
          type,
          messages: [],
          createdAt: new Date(),
          projectId: projectId ?? get().currentProjectId ?? null,
          model: model ?? get().settings.model,
          provider: provider ?? get().settings.provider,
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChat.id,
        }));
        return newChat.id;
      },
      addMessage: (chatId, message) => {
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: [...chat.messages, newMessage] }
              : chat,
          ),
        }));
        // Fire-and-forget: if this message carries a giant base64 image/video,
        // push it to Supabase and replace the inline payload with a small URL.
        offloadMessageMedia(chatId, newMessage.id, set);
        return newMessage.id;
      },
      updateMessage: (chatId, messageId, content, image, video, modelUsed) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === messageId
                    ? {
                      ...msg,
                      content,
                      ...(image && { image }),
                      ...(video && { video }),
                      ...(modelUsed && { modelUsed })
                    }
                    : msg,
                ),
              }
              : chat,
          ),
        }));
        if (image || video) offloadMessageMedia(chatId, messageId, set);
      },
      deleteMessage: (chatId, messageId) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                ...chat,
                messages: chat.messages.filter((msg) => msg.id !== messageId),
              }
              : chat,
          ),
        }));
      },
      updateChatTitle: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title } : chat,
          ),
        }));
      },
      updateChatProject: (chatId, projectId) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, projectId } : chat,
          ),
        }));
      },
      updateChatModel: (chatId, model, provider) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, model, provider } : chat,
          ),
        }));
      },
      deleteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        }));
      },
      setIsStreaming: (isStreaming, chatId) => set((state) => ({ 
        isStreaming, 
        streamingChatId: isStreaming ? (chatId ?? state.currentChatId) : null 
      })),
      getIsStreamingForChat: (chatId) => {
        const state = get();
        // Only show streaming for the specific chat that is streaming
        return state.isStreaming && state.streamingChatId === chatId;
      },
      getCurrentChat: () => {
        const { currentChatId, chats } = get();
        return currentChatId ? chats.find((c) => c.id === currentChatId) ?? null : null;
      },
      getChatsByType: (type) => {
        return get().chats.filter((c) => c.type === type);
      },
      clearAllChats: () => set({ chats: [], currentChatId: null }),

      // Projects
      setCurrentProject: (id) => set({ currentProjectId: id }),
      createProject: (data) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          ...data,
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
          currentProjectId: newProject.id,
        }));
        return newProject.id;
      },
      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p,
          ),
        }));
      },
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },
      appendToProjectMemory: (id, chunk) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== id) return p;
            const updatedMemory = (p.memory ?? "") + "\n" + chunk;
            const neuralEntries = (p.memoryEntries as any[]) || [];
            const newEntry: any = {
              id: `mem-${Date.now()}-${Math.random()}`,
              content: chunk.trim(),
              importance: 0.5,
              timestamp: new Date(),
              lastAccessedAt: new Date(),
              accessCount: 1,
              type: "note",
            };
            return {
              ...p,
              memory: updatedMemory,
              memoryEntries: [...neuralEntries, newEntry],
            };
          }),
        }));
      },
      getProject: (id) => {
        if (!id) return null;
        return get().projects.find((p) => p.id === id) ?? null;
      },
      exportProjectMemory: (id) => {
        const project = get().getProject(id);
        return project?.memory ?? "";
      },

      // Settings
      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },
    }),
    {
      name: "chat-store",
      version: 1,
      // Throttled, quota-aware storage. Auto-offloads big data: URLs to Supabase
      // when localStorage is about to overflow — keeps iOS smooth.
      storage: createJSONStorage(() => createSafeStorage()),
      // Don't persist volatile UI state (otherwise every token of a stream
      // triggers a localStorage write).
      partialize: (state) => ({
        chats: state.chats,
        projects: state.projects,
        currentChatId: state.currentChatId,
        currentProjectId: state.currentProjectId,
        settings: state.settings,
      }),
    }
  )
);
