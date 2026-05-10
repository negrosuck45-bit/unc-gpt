import CustomModelService, { ChatMessage } from '@/lib/models/custom-model-service';

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (input: Record<string, any>) => Promise<string>;
}

export interface AgentConfig {
  modelService: CustomModelService;
  tools: Tool[];
  mcpManager?: MCPManager;
  systemPrompt?: string;
  maxIterations?: number;
}

export interface AgentStep {
  iteration: number;
  action: 'think' | 'tool_use' | 'complete';
  toolName?: string;
  toolInput?: Record<string, any>;
  toolResult?: string;
  reasoning?: string;
}

export interface AgentResponse {
  finalAnswer: string;
  steps: AgentStep[];
  tokensUsed?: number;
  success: boolean;
}

export class AgentService {
  private modelService: CustomModelService;
  private tools: Map<string, Tool> = new Map();
  private mcpManager?: MCPManager;
  private systemPrompt: string;
  private maxIterations: number;

  constructor(config: AgentConfig) {
    this.modelService = config.modelService;
    this.mcpManager = config.mcpManager;
    this.maxIterations = config.maxIterations || 10;

    // Register tools
    config.tools.forEach((tool) => {
      this.tools.set(tool.name, tool);
    });

    this.systemPrompt =
      config.systemPrompt ||
      `You are a helpful AI agent. You have access to tools that you can use to complete tasks.

When you need to use a tool:
1. Think about what you need to do
2. Call the appropriate tool with the correct arguments
3. Analyze the result
4. Repeat until you have the answer

Always be clear about your reasoning and what tools you're using.`;
  }

  /**
   * Get available tools as schema for the model
   */
  private getToolSchemas(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, any>;
  }> {
    const schemas: Array<{
      name: string;
      description: string;
      input_schema: Record<string, any>;
    }> = [];

    // Add registered tools
    this.tools.forEach((tool) => {
      schemas.push({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      });
    });

    // Add MCP tools if available
    if (this.mcpManager) {
      const mcpTools = this.mcpManager.getAvailableTools();
      mcpTools.forEach((tool) => {
        schemas.push({
          name: `mcp_${tool.server}_${tool.name}`,
          description: `[MCP] ${tool.description}`,
          input_schema: tool.inputSchema,
        });
      });
    }

    return schemas;
  }

  /**
   * Execute a tool
   */
  private async executeTool(toolName: string, input: Record<string, any>): Promise<string> {
    // Check if it's a local tool
    const tool = this.tools.get(toolName);
    if (tool) {
      try {
        return await tool.execute(input);
      } catch (error) {
        return `Error executing tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Check if it's an MCP tool
    if (toolName.startsWith('mcp_') && this.mcpManager) {
      const parts = toolName.split('_');
      const server = parts[1];
      const tool = parts.slice(2).join('_');

      try {
        return await this.mcpManager.callTool(server, tool, input);
      } catch (error) {
        return `Error calling MCP tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return `Unknown tool: ${toolName}`;
  }

  /**
   * Run the agent loop
   */
  async run(task: string): Promise<AgentResponse> {
    const steps: AgentStep[] = [];
    const messages: ChatMessage[] = [{ role: 'user', content: task }];

    let iteration = 0;
    let finalAnswer = '';
    let success = false;

    while (iteration < this.maxIterations) {
      iteration++;

      // Call the model
      const toolSchemas = this.getToolSchemas();

      // Build system prompt with tools
      let systemPrompt = this.systemPrompt;
      if (toolSchemas.length > 0) {
        systemPrompt += `\n\nAvailable tools:\n${toolSchemas.map((t) => `- ${t.name}: ${t.description}`).join('\n')}`;
      }

      const response = await this.modelService.chat(messages, systemPrompt);

      // Check if model wants to use tools
      // For now, we'll use a simple heuristic: if the response mentions a tool name, we execute it
      const toolMatches = response.content.match(/\[TOOL:(\w+)\s*({[^}]+})\]/g) || [];

      if (toolMatches.length === 0) {
        // No tool calls, agent is done
        finalAnswer = response.content;
        success = true;
        steps.push({
          iteration,
          action: 'complete',
          reasoning: finalAnswer,
        });
        break;
      }

      // Process tool calls
      for (const match of toolMatches) {
        const toolMatch = match.match(/\[TOOL:(\w+)\s*({[^}]+})\]/);
        if (!toolMatch) continue;

        const toolName = toolMatch[1];
        let toolInput: Record<string, any> = {};

        try {
          toolInput = JSON.parse(toolMatch[2]);
        } catch {
          // If parsing fails, try to extract key-value pairs
          const pairs = toolMatch[2].match(/(\w+):\s*"([^"]+)"/g) || [];
          pairs.forEach((pair) => {
            const [key, value] = pair.split(':').map((s) => s.trim());
            toolInput[key] = value.replace(/"/g, '');
          });
        }

        // Execute tool
        const toolResult = await this.executeTool(toolName, toolInput);

        steps.push({
          iteration,
          action: 'tool_use',
          toolName,
          toolInput,
          toolResult,
        });

        // Add tool result to message history
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        messages.push({
          role: 'user',
          content: `Tool ${toolName} returned: ${toolResult}`,
        });
      }
    }

    if (iteration >= this.maxIterations) {
      finalAnswer = 'Max iterations reached. Agent did not complete the task.';
      success = false;
    }

    return {
      finalAnswer,
      steps,
      success,
    };
  }

  /**
   * Stream agent execution
   */
  async *runStream(task: string): AsyncGenerator<AgentStep, void, unknown> {
    const messages: ChatMessage[] = [{ role: 'user', content: task }];

    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      const toolSchemas = this.getToolSchemas();

      let systemPrompt = this.systemPrompt;
      if (toolSchemas.length > 0) {
        systemPrompt += `\n\nAvailable tools:\n${toolSchemas.map((t) => `- ${t.name}: ${t.description}`).join('\n')}`;
      }

      // Stream response
      let fullResponse = '';
      for await (const chunk of this.modelService.chatStream(messages, systemPrompt)) {
        fullResponse += chunk;
      }

      // Check for tool calls
      const toolMatches = fullResponse.match(/\[TOOL:(\w+)\s*({[^}]+})\]/g) || [];

      if (toolMatches.length === 0) {
        yield {
          iteration,
          action: 'complete',
          reasoning: fullResponse,
        };
        break;
      }

      // Process tool calls
      for (const match of toolMatches) {
        const toolMatch = match.match(/\[TOOL:(\w+)\s*({[^}]+})\]/);
        if (!toolMatch) continue;

        const toolName = toolMatch[1];
        let toolInput: Record<string, any> = {};

        try {
          toolInput = JSON.parse(toolMatch[2]);
        } catch {
          const pairs = toolMatch[2].match(/(\w+):\s*"([^"]+)"/g) || [];
          pairs.forEach((pair) => {
            const [key, value] = pair.split(':').map((s) => s.trim());
            toolInput[key] = value.replace(/"/g, '');
          });
        }

        const toolResult = await this.executeTool(toolName, toolInput);

        yield {
          iteration,
          action: 'tool_use',
          toolName,
          toolInput,
          toolResult,
        };

        messages.push({
          role: 'assistant',
          content: fullResponse,
        });

        messages.push({
          role: 'user',
          content: `Tool ${toolName} returned: ${toolResult}`,
        });
      }
    }
  }
}

export default AgentService;
