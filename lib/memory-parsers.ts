// Parsers for external AI chat exports.
// All parsers return a single plain-text memory string that can be stored
// on a project and injected into future prompts as "relevant memory".

export interface ParsedConversation {
  title: string
  createdAt?: Date
  turns: { role: string; content: string }[]
}

export interface ParseResult {
  source: "chatgpt" | "claude" | "unknown"
  conversations: ParsedConversation[]
  memoryText: string
  totalMessages: number
}

function stripParts(part: any): string {
  if (typeof part === "string") return part
  if (Array.isArray(part)) return part.map(stripParts).filter(Boolean).join("\n")
  if (part && typeof part === "object") {
    if (typeof part.text === "string") return part.text
    if (typeof part.content === "string") return part.content
    if (Array.isArray(part.parts)) return part.parts.map(stripParts).filter(Boolean).join("\n")
    if (Array.isArray(part.content)) return part.content.map(stripParts).filter(Boolean).join("\n")
  }
  return ""
}

// ---------------------------------------------------------------------------
// ChatGPT exports
//
// Format: an array of conversation objects. Each has a `mapping` of node
// objects, each node has a `message` with `author.role` and
// `content.parts[]`.
// ---------------------------------------------------------------------------

function parseChatGPTExport(raw: any): ParsedConversation[] {
  if (!Array.isArray(raw)) return []
  const conversations: ParsedConversation[] = []

  for (const convo of raw) {
    if (!convo || typeof convo !== "object") continue
    const title = convo.title ?? "Untitled"
    const createdAt = convo.create_time
      ? new Date(convo.create_time * 1000)
      : undefined
    const mapping = convo.mapping ?? {}

    // Walk nodes in creation order.
    const nodes = Object.values(mapping)
      .filter((n: any) => n?.message?.content)
      .sort(
        (a: any, b: any) =>
          (a.message?.create_time ?? 0) - (b.message?.create_time ?? 0),
      )

    const turns: { role: string; content: string }[] = []
    for (const node of nodes as any[]) {
      const msg = node.message
      const role = msg?.author?.role
      if (!role || role === "system" || role === "tool") continue
      const parts = msg.content?.parts ?? msg.content ?? []
      const text = stripParts(parts).trim()
      if (!text) continue
      turns.push({ role: role === "assistant" ? "assistant" : "user", content: text })
    }

    if (turns.length > 0) conversations.push({ title, createdAt, turns })
  }
  return conversations
}

// ---------------------------------------------------------------------------
// Claude exports
//
// Format varies slightly by export, but typically an array of conversations
// with a `chat_messages` array containing `sender` ("human"/"assistant") and
// `text`.
// ---------------------------------------------------------------------------

function parseClaudeExport(raw: any): ParsedConversation[] {
  if (!Array.isArray(raw)) return []
  const conversations: ParsedConversation[] = []

  for (const convo of raw) {
    if (!convo || typeof convo !== "object") continue
    const title = convo.name ?? convo.title ?? "Untitled"
    const createdAt = convo.created_at ? new Date(convo.created_at) : undefined
    const messages = convo.chat_messages ?? convo.messages ?? []
    if (!Array.isArray(messages)) continue

    const turns: { role: string; content: string }[] = []
    for (const msg of messages) {
      const sender = msg.sender ?? msg.role
      const text = (msg.text ?? stripParts(msg.content) ?? "").trim()
      if (!text) continue
      const role =
        sender === "assistant" || sender === "Assistant" ? "assistant" : "user"
      turns.push({ role, content: text })
    }
    if (turns.length > 0) conversations.push({ title, createdAt, turns })
  }
  return conversations
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function detectSource(raw: any): "chatgpt" | "claude" | "unknown" {
  if (!Array.isArray(raw) || raw.length === 0) return "unknown"
  const first = raw[0]
  if (!first || typeof first !== "object") return "unknown"
  if (first.mapping) return "chatgpt"
  if (first.chat_messages || Array.isArray(first.messages)) return "claude"
  return "unknown"
}

export function parseExport(raw: any): ParseResult {
  const source = detectSource(raw)
  let conversations: ParsedConversation[] = []
  if (source === "chatgpt") conversations = parseChatGPTExport(raw)
  else if (source === "claude") conversations = parseClaudeExport(raw)

  const totalMessages = conversations.reduce((n, c) => n + c.turns.length, 0)

  const memoryText = conversations
    .map((c) => {
      const header = `### ${c.title}${
        c.createdAt ? ` (${c.createdAt.toISOString().slice(0, 10)})` : ""
      }`
      const body = c.turns
        .map((t) => `${t.role === "assistant" ? "Assistant" : "User"}: ${t.content}`)
        .join("\n")
      return `${header}\n${body}`
    })
    .join("\n\n---\n\n")

  return { source, conversations, memoryText, totalMessages }
}

// Summarises memory so it fits inside model context when attached per-turn.
// Keeps first N chars, splits on sentence boundaries.
export function truncateMemory(memory: string, maxChars = 6000): string {
  if (!memory) return ""
  if (memory.length <= maxChars) return memory
  const head = memory.slice(0, maxChars)
  const lastBreak = Math.max(
    head.lastIndexOf("\n---\n"),
    head.lastIndexOf("\n\n"),
    head.lastIndexOf(". "),
  )
  return (lastBreak > 1000 ? head.slice(0, lastBreak) : head).trim() + "\n…(truncated)"
}
