import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// ============================================================
// IMPORTS FROM EXISTING CHAT ROUTE
// ============================================================
const CHAT_WORKER_URLS = [
  "https://old-hat-dab9.gamingac527.workers.dev",
  "https://aiagent.negro-suck45.workers.dev",
];

const IMAGE_VIDEO_WORKER_URL = "https://fragrant-band-d94a.blackmonkey098gg.workers.dev";

const GROQ_CHAT_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
};

const PUTER_CLAUDE_MODELS: Record<string, string> = {
  "claude-opus-4.7": "claude-opus-4.7",
  "claude-sonnet-4.6": "claude-sonnet-4.6",
};

// ============================================================
// MCP INTEGRATION
// ============================================================

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  server?: string;
}

async function getMCPTools(): Promise<MCPTool[]> {
  // In production, fetch from your MCP registry
  // For now, return hardcoded defaults that can be expanded
  return [
    {
      name: "github:list-issues",
      description: "List GitHub issues from a repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string", description: "GitHub owner/org" },
          repo: { type: "string", description: "Repository name" },
          state: { type: "string", enum: ["open", "closed", "all"] },
        },
        required: ["owner", "repo"],
      },
      server: "github",
    },
    {
      name: "github:create-issue",
      description: "Create a new GitHub issue",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue description" },
          labels: { type: "array", items: { type: "string" } },
        },
        required: ["owner", "repo", "title"],
      },
      server: "github",
    },
    {
      name: "github:create-repository",
      description: "Create a new GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Repository name" },
          description: { type: "string" },
          private: { type: "boolean" },
          auto_init: { type: "boolean", description: "Initialize with README" },
        },
        required: ["name"],
      },
      server: "github",
    },
    {
      name: "github:update-file",
      description: "Update a file in a GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          path: { type: "string", description: "File path" },
          content: { type: "string", description: "New file content" },
          message: { type: "string", description: "Commit message" },
          branch: { type: "string", description: "Target branch" },
        },
        required: ["owner", "repo", "path", "content", "message"],
      },
      server: "github",
    },
  ];
}

async function executeMCPTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  // Mock implementation - in production, this would:
  // 1. Route to the appropriate MCP server
  // 2. Execute the tool
  // 3. Return the result

  // For now, return a simulated response
  console.log(`[MCP] Executing tool: ${toolName}`, toolInput);

  // Simulate different tools
  if (toolName.includes("list-issues")) {
    return JSON.stringify([
      { id: 1, title: "Add MCP support", state: "open", labels: ["feature"] },
      { id: 2, title: "Fix image rendering", state: "closed", labels: ["bug"] },
    ]);
  }

  if (toolName.includes("create-issue")) {
    return JSON.stringify({
      id: 123,
      title: toolInput.title,
      state: "open",
      url: `https://github.com/${toolInput.owner}/${toolInput.repo}/issues/123`,
    });
  }

  if (toolName.includes("create-repository")) {
    return JSON.stringify({
      name: toolInput.name,
      url: `https://github.com/user/${toolInput.name}`,
      created: true,
    });
  }

  if (toolName.includes("update-file")) {
    return JSON.stringify({
      path: toolInput.path,
      updated: true,
      commit: "abc1234",
      message: toolInput.message,
    });
  }

  return JSON.stringify({ error: "Unknown MCP tool" });
}

// ============================================================
// ENHANCED CHAT RESPONSE WITH TOOL SUPPORT
// ============================================================

async function callChatWithTools(
  messages: any[],
  model: string,
  mcpTools: MCPTool[]
): Promise<{ stream: ReadableStream; provider: string; model: string }> {
  // This would use Anthropic SDK with tool use support
  // For now, return a mock stream

  const encoder = new TextEncoder();
  const s = new ReadableStream({
    async start(controller) {
      // Send initial provider/model info
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ provider: "Groq", model: model })}\n\n`
        )
      );

      // Simulate a response with tool use
      const content = `I'll help you with your GitHub repository. Let me create a new issue and update your project.`;

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
      );

      // In production, handle actual tool calls here
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return { stream: s, provider: "Groq with MCP", model };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      model,
      provider,
      projectInstructions,
      projectMemory,
      enableMCP = true,
    } = body;

    // Get available MCP tools
    const mcpTools = enableMCP ? await getMCPTools() : [];

    // Build system prompt with MCP tools info
    const systemParts: string[] = [
      `You are a helpful, intelligent AI assistant with access to external tools and services.
Be conversational and natural. Provide accurate, well-reasoned answers.

${
  mcpTools.length > 0
    ? `Available Tools:
${mcpTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

When the user asks you to perform actions (create repos, manage issues, etc.), use these tools.
Always confirm what action you're about to take before executing it.
Format tool calls as: [TOOL_CALL: tool_name with arguments {...}]`
    : ""
}`,
    ];

    if (projectInstructions) {
      systemParts.push(`\n\nProject Instructions:\n${projectInstructions}`);
    }
    if (projectMemory) {
      systemParts.push(`\n\nRelevant Memory:\n${projectMemory}`);
    }

    const finalModel = model || "llama-3.3-70b-versatile";
    const finalProvider = provider || "groq";

    // For now, use basic chat
    // In production: detect tool_use responses and handle them
    const result = await callChatWithTools(messages, finalModel, mcpTools);

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
