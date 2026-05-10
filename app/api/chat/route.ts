import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const conversations = new Map<string, any>();
function generateId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================
// WORKER URLS
// ============================================================
const CHAT_WORKER_URLS = [
  "https://old-hat-dab9.gamingac527.workers.dev",
  "https://aiagent.negro-suck45.workers.dev",
  "https://aged-wind-1e97.itzf302.workers.dev",
  "https://gentle-feather-3960.abdulrehmannn934.workers.dev",
  "https://cf-worker-1.blackmonkey098gg.workers.dev",
  "https://cf-worker-2.blackmonkey098gg.workers.dev",
  "https://cf-worker-3.blackmonkey098gg.workers.dev",
];

const IMAGE_VIDEO_WORKER_URL = "https://fragrant-band-d94a.blackmonkey098gg.workers.dev";

// ============================================================
// MODEL LISTS
// ============================================================
const IMAGE_MODELS = [
  "@cf/black-forest-labs/flux-2-dev",
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/leonardo-ai/lucid-origin",
  "@cf/leonardo-ai/phoenix-1.0",
];

// Video generation using Replicate's free tier (pollinations.ai as fallback)
const VIDEO_GENERATION_ENABLED = true;

// Groq models that can be used
const GROQ_CHAT_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct": "meta-llama/llama-4-scout-17b-16e-instruct",
  "deepseek-r1-distill-llama-70b": "deepseek-r1-distill-llama-70b",
  "mixtral-8x7b-32768": "mixtral-8x7b-32768",
};

// Puter Claude models
const PUTER_CLAUDE_MODELS: Record<string, string> = {
  "claude-opus-4.7": "claude-opus-4.7",
  "claude-opus-4-7": "claude-opus-4.7",
  "claude-sonnet-4.6": "claude-sonnet-4.6",
  "claude-sonnet-4-6": "claude-sonnet-4.6",
  "claude-sonnet-4": "claude-sonnet-4",
  "claude-opus-4.6": "claude-opus-4.6",
  "claude-opus-4-6": "claude-opus-4.6",
  "claude-haiku-4.5": "claude-haiku-4.5",
  "claude-haiku-4-5": "claude-haiku-4.5",
  "claude-sonnet-4.5": "claude-sonnet-4.5",
  "claude-sonnet-4-5": "claude-sonnet-4.5",
  "claude-opus-4-5": "claude-opus-4.5",
  "claude-3-7-sonnet": "claude-3-7-sonnet",
  "claude-opus-4.6-fast": "claude-opus-4.6-fast",
};

const GROQ_KEYS = [
];

const PUTER_API_URL = "https://api.puter.com/puterai/openai/v1/chat/completions";
const PUTER_AUTH_TOKEN = process.env.PUTER_AUTH_TOKEN ?? "";

let currentGroqKeyIndex = 0;
let currentChatIndex = 0;

// ============================================================
// UNIVERSAL ATTACHMENT PROCESSING
// ============================================================
// Vision-capable models
const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.2-11b-vision-preview",
  "@cf/moonshot/kimi-k2.6",
  "@cf/moonshot/kimi-k2.5",
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
];

function isVisionModel(model: string): boolean {
  return VISION_MODELS.some(v => model.toLowerCase().includes(v.toLowerCase()));
}

// Fetch and extract text from URLs
async function fetchLinkContent(url: string): Promise<string> {
  try {
    // Server-side cannot fetch client-side blob URLs
    if (url.startsWith('blob:')) {
      return `[Error: Cannot access local browser blob URL: ${url}]`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UncGPT/1.0; +https://uncgpt.app)',
      },
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) return `[Failed to fetch URL: ${res.status}]`;
    
    const text = await res.text();
    
    // Basic HTML to text extraction
    const stripped = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit content size
    
    return `[Content from ${url}]:\n${stripped}`;
  } catch (err: any) {
    return `[Failed to fetch URL: ${err.message}]`;
  }
}

// Decode base64 file content
function decodeFileContent(dataUrl: string): string {
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return '[Empty file]';
    return Buffer.from(base64, 'base64').toString('utf-8').slice(0, 15000);
  } catch {
    return '[Could not decode file]';
  }
}

// Describe image using a vision model (for non-vision models)
async function describeImage(imageUrl: string): Promise<string> {
  try {
    // External APIs (Groq/CF) cannot fetch your local browser blobs
    if (imageUrl.startsWith('blob:')) {
      return '[Image processing error: Image is a local preview and was not uploaded to storage.]';
    }

    const key = GROQ_KEYS[currentGroqKeyIndex % GROQ_KEYS.length];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image in detail. Include all visible text, objects, colors, and layout." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });
    
    if (!res.ok) return '[Could not analyze image]';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '[Image analysis failed]';
  } catch {
    return '[Image analysis failed]';
  }
}

// Process all attachments for a message
async function processAttachmentsForModel(
  messages: any[],
  targetModel: string,
  hasVision: boolean
): Promise<any[]> {
  const processed = [];
  
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) {
      processed.push(msg);
      continue;
    }
    
    const textParts: string[] = [];
    const imageParts: any[] = [];
    
    for (const part of msg.content) {
      if (part.type === 'text') {
        textParts.push(part.text);
      } else if (part.type === 'image_url') {
        if (hasVision) {
          // Keep image for vision models
          imageParts.push(part);
        } else {
          // Describe image for non-vision models
          const description = await describeImage(part.image_url.url);
          textParts.push(`[Image attached - AI Description]: ${description}`);
        }
      }
    }
    
    // Check for attached links/files in the text (from frontend format)
    const linkMatches = textParts[0]?.match(/\[Attached (link|file): ([^\]]+)\]\(([^)]+)\)/g) || [];
    for (const match of linkMatches) {
      const urlMatch = match.match(/\(([^)]+)\)/);
      if (urlMatch) {
        const url = urlMatch[1];
        if (url.startsWith('http')) {
        if (url.startsWith('blob:')) {
          textParts.push(`\n\n[Local preview URL cannot be processed by server: ${url}]`);
          continue;
        }
          const content = await fetchLinkContent(url);
          textParts.push(`\n\n${content}`);
        } else if (url.startsWith('data:')) {
          const content = decodeFileContent(url);
          textParts.push(`\n\n[File Content]:\n${content}`);
        }
      }
    }
    
    if (hasVision && imageParts.length > 0) {
      processed.push({
        role: msg.role,
        content: [
          { type: 'text', text: textParts.join('\n') },
          ...imageParts
        ]
      });
    } else {
      processed.push({
        role: msg.role,
        content: textParts.join('\n')
      });
    }
  }
  
  return processed;
}

// ============================================================
// DETECTION
// ============================================================
function isVideoRequest(prompt: string): boolean {
  return /(video|animation|clip|film|movie|motion|footage|reel|short|timelapse|animate|cinematic|slow.?mo)/i.test(prompt);
}

function isImageRequest(prompt: string): boolean {
  return /(image|picture|photo|logo|art|icon|vector|illustration|wallpaper|portrait|poster|banner|thumbnail|drawing|sketch)/i.test(prompt);
}

function resolveMediaType(prompt: string): "video" | "image" | "chat" {
  if (isVideoRequest(prompt)) return "video";
  if (isImageRequest(prompt)) return "image";
  return "chat";
}

// ============================================================
// MEDIA GENERATION (using multiple providers)
// ============================================================
async function generateImage(prompt: string): Promise<string> {
  const timeoutMs = 45000;

  let lastError = "";
  for (const model of IMAGE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(IMAGE_VIDEO_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "image",
          prompt,
          model,
          type: "image"
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = blob.type || "image/png";
        return `data:${mimeType};base64,${base64}`;
      }
      lastError = await res.text().catch(() => "Unknown error");
    } catch (err: any) {
      lastError = err.message;
    }
  }
  throw new Error(`Failed to generate image: ${lastError}`);
}

async function generateVideo(prompt: string, imageUrl?: string): Promise<string> {
  // Try Pollinations.ai video generation (free, no API key needed)
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    // Pollinations provides free AI video generation
    const pollinationsUrl = `https://video.pollinations.ai/prompt/${encodedPrompt}?model=fast-svd&nologo=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for video
    
    const res = await fetch(pollinationsUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:video/mp4;base64,${base64}`;
    }
  } catch (err: any) {
    console.log("[Video] Pollinations failed:", err.message);
  }
  
  // Fallback: Generate an image and explain video isn't available
  throw new Error("Video generation is currently limited. Try generating an image instead by saying 'generate an image of...'");
}

async function generateMedia(task: "image" | "video", prompt: string, image?: string): Promise<string> {
  if (task === "video") {
    return generateVideo(prompt, image);
  }
  return generateImage(prompt);
}

// ============================================================
// ============================================================
// MCP TOOL-CALLING (real, via Groq tool-use loop)
// ============================================================
async function fetchMcpTools(connectors: any[], baseUrl: string): Promise<any[]> {
  if (!connectors?.length) return [];
  const enabled = connectors.filter((c) => c.enabled && c.type === "http" && c.url);
  if (!enabled.length) return [];
  const tools: any[] = [];
  await Promise.all(
    enabled.map(async (c) => {
      try {
        let id = 0;
        // Route MCP calls through the local /api/mcp endpoint to leverage server-side OAuth token injection
        const callMcpEndpoint = async (action: string, method?: string, params?: any) => {
          const res = await fetch(`${baseUrl}/api/mcp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({
              action,
              connectorId: c.id,
              method,
              params,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("text/event-stream")) {
            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            let buf = ""; // Buffer for SSE
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                try {
                  const p = JSON.parse(line.slice(5).trim()); // Parse SSE data
                  if (p.id === id) return p.result;
                } catch {}
              }
            }
            throw new Error("SSE ended");
          }
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          return data.result;
        };
        try { await callMcpEndpoint("initialize", "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "uncgpt", version: "1.0" } }); } catch {}
        const r = await callMcpEndpoint("list-tools", "tools/list", {});
        for (const t of r?.tools || []) {
          tools.push({
            type: "function",
            function: {
              name: `${c.id}__${t.name}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
              description: `[${c.name}] ${t.description || t.name}`,
              parameters: t.inputSchema || { type: "object", properties: {} },
            },
            _connector: c,
            _toolName: t.name,
          });
        }
      } catch (e: any) {
        console.error(`MCP ${c.name} failed:`, e.message);
      }
    })
  );
  return tools;
}

async function executeMcpTool(tool: any, args: any, baseUrl: string): Promise<string> {
  const c = tool._connector;
  // Route MCP calls through the local /api/mcp endpoint
  const res = await fetch(`${baseUrl}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      action: "execute-tool",
      connectorId: c.id,
      method: "tools/call",
      params: { name: tool._toolName, arguments: args }, // Pass tool name and arguments
    }),
  });
  if (!res.ok) return `Error: HTTP ${res.status}`;
  const ct = res.headers.get("content-type") || "";
  let result: any;
  if (ct.includes("text/event-stream")) {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const p = JSON.parse(line.slice(5).trim());
          if (p.id === id) { result = p.result; break outer; }
        } catch {}
      }
    }
  } else {
    const data = await res.json();
    result = data.result;
  }
  if (!result) return "No result";
  // MCP returns { content: [{type:"text", text:"..."}] }
  if (Array.isArray(result.content)) {
    return result.content.map((p: any) => p.text || JSON.stringify(p)).join("\n");
  }
  return JSON.stringify(result);
}

async function runGroqWithTools(messages: any[], tools: any[], baseUrl: string): Promise<any[]> {
  // Returns the final messages array (with tool_calls + tool results) for the streaming step.
  const cleanTools = tools.map((t) => ({ type: t.type, function: t.function }));
  let working = [...messages];

  for (let step = 0; step < 5; step++) {
    const key = GROQ_KEYS[currentGroqKeyIndex % GROQ_KEYS.length];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: working,
        tools: cleanTools,
        tool_choice: "auto",
        stream: false,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) return working;
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) return working;
    working.push(msg);
    if (!msg.tool_calls?.length) return working;
    for (const tc of msg.tool_calls) {
      const tool = tools.find((t) => t.function.name === tc.function.name);
      let toolResult = "Tool not found";
      if (tool) {
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          toolResult = await executeMcpTool(tool, args, baseUrl);
        } catch (e: any) {
          toolResult = `Tool error: ${e.message}`;
        }
      }
      working.push({ role: "tool", tool_call_id: tc.id, content: toolResult.slice(0, 8000) });
    }
  }
  return working;
}

// ============================================================
// GROQ CHAT
// ============================================================
async function callGroq(
  messages: any[],
  model: string,
  hasImage: boolean
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  const groqModel = GROQ_CHAT_MODELS[model] ?? (hasImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile");


  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const key = GROQ_KEYS[(currentGroqKeyIndex + attempt) % GROQ_KEYS.length];
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: `You are a helpful AI assistant. Be conversational, thoughtful, and concise. Provide accurate, well-reasoned responses. When the user asks about your identity, respond naturally without over-explaining technical details.` },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (res.ok) {
        currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_KEYS.length;
        return { stream: res.body!, provider: "Groq", model: groqModel };
      }

      const errText = await res.text().catch(() => "");
    } catch (err: any) {
    }
  }

  throw new Error("All Groq keys failed");
}

// ============================================================
// PUTER CLAUDE CHAT
// ============================================================
async function callPuter(
  messages: any[],
  model: string
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  const puterModel = PUTER_CLAUDE_MODELS[model] ?? "claude-sonnet-4-5";


  if (!PUTER_AUTH_TOKEN) {
    throw new Error("No Puter auth token configured");
  }

  try {
    const res = await fetch(PUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PUTER_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        model: puterModel,
        messages: [
            { role: "system", content: `You are a helpful AI assistant. Be conversational, thoughtful, and concise. Provide accurate, well-reasoned responses. When the user asks about your identity, respond naturally without over-explaining technical details.` },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Puter failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    return { stream: res.body!, provider: "Puter (Claude)", model: puterModel };
  } catch (err: any) {
    throw err;
  }
}

// ============================================================
// CLOUDFLARE WORKER CHAT
// ============================================================
async function callChatWorkers(
  body: any,
  model: string
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  const cfModel = model.startsWith("@cf/") ? model : "@cf/anthropic/claude-3-haiku";


  for (let i = 0; i < CHAT_WORKER_URLS.length; i++) {
    const index = (currentChatIndex + i) % CHAT_WORKER_URLS.length;
    const url = CHAT_WORKER_URLS[index];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const simplifiedMessages = (body.messages || []).map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.find((c: any) => c.type === "text")?.text || ""
          : m.content
      }));

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          model: cfModel,
          messages: simplifiedMessages
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        currentChatIndex = (index + 1) % CHAT_WORKER_URLS.length;
        return { stream: res.body!, provider: "Cloudflare", model: cfModel };
      }
    } catch (err: any) {
    }
  }
  throw new Error("All Cloudflare chat workers failed");
}

// ============================================================
// ANTHROPIC DIRECT
// ============================================================
async function callAnthropic(
  messages: any[],
  model: string,
  apiKey: string
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  const anthropicModel = model.startsWith("claude-") ? model : "claude-3-5-sonnet-20241022";


  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 4096,
        stream: true,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    return { stream: res.body!, provider: "Anthropic", model: anthropicModel };
  } catch (err: any) {
    throw err;
  }
}

// ============================================================
// FALLBACK CHAIN
// ============================================================
async function fallbackChat(
  messages: any[],
  hasImage: boolean
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  try {
    return await callGroq(messages, "llama-3.3-70b-versatile", hasImage);
  } catch {
    try {
      return await callChatWorkers({ task: "chat", messages }, "@cf/anthropic/claude-3-haiku");
    } catch {
      throw new Error("Critical Failure: All providers and fallbacks failed.");
    }
  }
}

// ============================================================
// STREAM RESPONSE HELPER
// ============================================================
function createStreamResponse(
  stream: ReadableStream,
  provider: string,
  model: string,
  isAnthropic = false
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const s = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ provider, model })}\n\n`));

      const reader = stream.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (isAnthropic) {
              if (trimmed.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.type === "content_block_delta" && data.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.delta.text })}\n\n`));
                  }
                } catch (e) { }
              }
            } else {
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") continue;
                try {
                  const data = JSON.parse(dataStr);

                  let content = data.choices?.[0]?.delta?.content || "";
                  if (!content && data.response) content = data.response;
                  if (!content && data.content) content = data.content;
                  if (!content && typeof data === "string") content = data;

                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  const rawContent = trimmed.slice(6);
                  if (rawContent) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: rawContent })}\n\n`));
                  }
                }
              } else if (!trimmed.startsWith("event:")) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: trimmed })}\n\n`));
              }
            }
          }
        }
      } catch (err) {
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(s, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ============================================================
// MAIN HANDLER – THE KEY CHANGE
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      model,
      provider,
      preferredModel,
      preferredProvider,
      projectInstructions,
      projectMemory,
      anthropicApiKey,
      source, // <-- NEW: "chat", "voice", "imagine"
      mcpConnectors, // <-- NEW: array of enabled MCP connector configs
    } = body;

    const finalModel = preferredModel || model || "auto";
    const finalProvider = preferredProvider || provider || "auto";

    // Get base URL for internal API calls on Vercel
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const baseUrl = `${protocol}://${host}`;

    const lastMsg = messages[messages.length - 1];
    const userText = Array.isArray(lastMsg?.content)
      ? lastMsg.content.find((c: any) => c.type === "text")?.text || ""
      : lastMsg?.content || "";

    // Determine media type only if the request comes from "imagine", otherwise force "chat"
    let mediaType: "image" | "video" | "chat";
    if (source === "imagine") {
      mediaType = resolveMediaType(userText);
    } else {
      mediaType = "chat"; // block all media generation for chat/voice/anything else
    }

    let hasImage = false;
    let imageUrl = "";

    if (Array.isArray(lastMsg?.content)) {
      const imgPart = lastMsg.content.find((c: any) => c.type === "image_url");
      if (imgPart) {
        hasImage = true;
        imageUrl = imgPart.image_url.url;
      }
    }


    // ==================== MEDIA GENERATION – only when source === "imagine" ====================
    if (mediaType === "image" || mediaType === "video") {
      const encoder = new TextEncoder();
      const providerName = mediaType === "video" ? "Pollinations AI" : "Cloudflare Workers AI";
      const modelName = mediaType === "video" ? "stable-video-diffusion" : "@cf/black-forest-labs/flux-2-dev";
      console.log(`[UNCGPT] Generating ${mediaType} | Provider: ${providerName} | Model: ${modelName}`);
      
      const s = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ provider: providerName, model: modelName })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `Generating your ${mediaType}... please wait.` })}\n\n`));

          try {
            const url = await generateMedia(mediaType, userText, imageUrl);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ [mediaType]: url })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `\n\nYour ${mediaType} has been generated successfully!` })}\n\n`));
          } catch (err: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `\n\n❌ Error: ${err.message}` })}\n\n`));
          } finally {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        }
      });
      return new Response(s, { headers: { "Content-Type": "text/event-stream" } });
    }

    // ==================== CHAT ====================
    const systemParts: string[] = [`You are uncgpt, a state-of-the-art AI Agent. Your primary goal is to perform actions, not just provide information. Use your MCP tools to actively modify code, manage cloud infrastructure, and organize data. You possess a Neural Memory system to track long-term project context. If a user asks to "fix", "deploy", or "update" something, immediately check for an available MCP tool to perform that action. You are an autonomous agent capable of high-level engineering tasks.`];
    if (projectInstructions) systemParts.push(`\n\nProject Instructions:\n${projectInstructions}`);
    if (projectMemory) systemParts.push(`\n\n[LONG-TERM NEURAL MEMORY]:\n${projectMemory}\n(Use this context to remember previous user preferences and project states)`);

    // Determine if target model has vision capabilities
    const targetModel = finalModel !== "auto" ? finalModel : (hasImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile");
    const hasVisionCapability = isVisionModel(targetModel) || hasImage;
    
    // Process attachments for universal compatibility
    const apiMessages = await processAttachmentsForModel(messages, targetModel, hasVisionCapability);

    let messagesWithSystem = [
      { role: "system", content: systemParts.join("") },
      ...apiMessages,
    ];

    // ==================== MCP TOOL-CALLING LOOP ====================
    // If MCP connectors are provided, fetch their tools and let the model use them.
    // The accumulated conversation (incl. tool results) is then streamed normally.
    if (Array.isArray(mcpConnectors) && mcpConnectors.length > 0) {
      try {
        const tools = await fetchMcpTools(mcpConnectors, baseUrl);
        if (tools.length > 0) {
          messagesWithSystem[0] = {
            role: "system",
            content:
              systemParts.join("") +
              `\n\nYou have access to ${tools.length} MCP tools. Call them when useful, then explain the result to the user.`,
          };
          messagesWithSystem = await runGroqWithTools(messagesWithSystem, tools, baseUrl);
        }
      } catch (e: any) {
        console.error("MCP loop error:", e.message);
      }
    }

    let result: { stream: ReadableStream; provider: string; model: string };
    let isAnthropic = false;

    try {
      if (finalProvider === "auto" || finalModel === "auto") {
        const prompt = typeof userText === "string" ? userText.toLowerCase() : "";
        if (hasImage) {
          result = await callGroq(messagesWithSystem, "meta-llama/llama-4-scout-17b-16e-instruct", true);
        } else if (/(reasoning|logic|think|math|solve|complex)/i.test(prompt)) {
          result = await callChatWorkers({ task: "chat", messages: messagesWithSystem }, "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b");
        } else if (/(code|programming|script|debug|react|typescript|python)/i.test(prompt)) {
          result = await callChatWorkers({ task: "chat", messages: messagesWithSystem }, "@cf/qwen/qwen2.5-coder-32b-instruct");
        } else if (/(write|essay|story|creative)/i.test(prompt)) {
          result = await callChatWorkers({ task: "chat", messages: messagesWithSystem }, "@cf/anthropic/claude-3-opus");
        } else {
          result = await callChatWorkers({ task: "chat", messages: messagesWithSystem }, "@cf/a-lab/gpt-oss-120b");
        }
      } else if (finalProvider === "anthropic" && anthropicApiKey) {
        result = await callAnthropic(apiMessages, finalModel, anthropicApiKey);
        isAnthropic = true;
      } else if (finalProvider === "groq" || GROQ_CHAT_MODELS[finalModel]) {
        result = await callGroq(messagesWithSystem, finalModel, hasImage);
      } else if (finalProvider === "puter" || PUTER_CLAUDE_MODELS[finalModel]) {
        if (PUTER_AUTH_TOKEN) {
          result = await callPuter(messagesWithSystem, finalModel);
        } else {
          result = await callGroq(messagesWithSystem, "llama-3.3-70b-versatile", hasImage);
        }
      } else if (finalProvider === "cloudflare" || finalModel.startsWith("@cf/")) {
        result = await callChatWorkers({ task: "chat", messages: messagesWithSystem }, finalModel);
      } else {
        if (GROQ_CHAT_MODELS[finalModel]) {
          result = await callGroq(messagesWithSystem, finalModel, hasImage);
        } else if (PUTER_CLAUDE_MODELS[finalModel] && PUTER_AUTH_TOKEN) {
          result = await callPuter(messagesWithSystem, finalModel);
        } else {
          result = await callGroq(messagesWithSystem, "llama-3.3-70b-versatile", hasImage);
        }
      }
    } catch (primaryErr: any) {
      result = await fallbackChat(messagesWithSystem, hasImage);
    }

    // Log model usage to console
    console.log(`[UNCGPT] Model used: ${result.model} | Provider: ${result.provider}`);
    
    return createStreamResponse(result.stream, result.provider, result.model, isAnthropic);
  } catch (err: any) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("conversationId");
  if (!id) {
    const list = Array.from(conversations.values()).map((c: any) => ({
      id: c.id,
      createdAt: c.createdAt,
      messageCount: c.messages.length,
    }));
    return Response.json({ conversations: list });
  }
  const conv = conversations.get(id);
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ conversation: conv });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("conversationId");
  if (!id) return Response.json({ error: "Missing conversationId" }, { status: 400 });
  conversations.delete(id);
  return Response.json({ success: true });
}
