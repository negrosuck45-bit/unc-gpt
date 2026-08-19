export type AgentGatewayTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  _remote: true;
};

function config() {
  const url = process.env.AGENT_GATEWAY_URL?.replace(/\/$/, "");
  const secret = process.env.AGENT_GATEWAY_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

export function isAgentGatewayConfigured(): boolean {
  return !!config();
}

export async function fetchAgentTools(): Promise<AgentGatewayTool[]> {
  const current = config();
  if (!current) return [];

  const response = await fetch(`${current.url}/v1/tools`, {
    headers: {
      Accept: "application/json",
      "X-UncGPT-Agent-Secret": current.secret,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Agent tool discovery failed (${response.status})`);

  const data = await response.json();
  if (!Array.isArray(data.tools)) return [];
  return data.tools
    .filter((tool: any) => tool?.name && tool?.description && tool?.inputSchema)
    .map((tool: any) => ({
      type: "function" as const,
      function: {
        name: `agent_${String(tool.name).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 58)}`,
        description: `[Cloud computer] ${tool.description}`,
        parameters: tool.inputSchema,
      },
      _remote: true as const,
    }));
}

export async function executeAgentTool(
  tool: AgentGatewayTool,
  args: Record<string, unknown>
): Promise<string> {
  const current = config();
  if (!current) return "Agent computer is not configured.";

  const remoteName = tool.function.name.replace(/^agent_/, "");
  const response = await fetch(`${current.url}/v1/tools/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-UncGPT-Agent-Secret": current.secret,
    },
    body: JSON.stringify({ name: remoteName, arguments: args }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return `Agent tool error (${response.status}): ${data.error || "unknown error"}`;
  return typeof data.result === "string" ? data.result : JSON.stringify(data.result ?? data);
}
