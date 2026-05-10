import { OpenAI } from 'openai';

export type ModelProvider = 'openai' | 'ollama' | 'custom' | 'groq' | 'together' | 'perplexity';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export class CustomModelService {
  private config: ModelConfig;
  private openaiClient?: OpenAI;

  constructor(config: ModelConfig) {
    this.config = config;

    // Initialize OpenAI-compatible client
    if (config.provider === 'openai' || config.baseUrl) {
      this.openaiClient = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        baseURL: config.baseUrl,
      });
    }
  }

  /**
   * Send a chat message to the model
   */
  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    switch (this.config.provider) {
      case 'openai':
      case 'custom':
        return this.chatOpenAI(allMessages);
      case 'ollama':
        return this.chatOllama(allMessages);
      case 'groq':
        return this.chatGroq(allMessages);
      case 'together':
        return this.chatTogether(allMessages);
      case 'perplexity':
        return this.chatPerplexity(allMessages);
      default:
        throw new Error(`Unsupported model provider: ${this.config.provider}`);
    }
  }

  /**
   * Chat with OpenAI-compatible API
   */
  private async chatOpenAI(messages: ChatMessage[]): Promise<ChatResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.model,
      messages: messages as Parameters<typeof this.openaiClient.chat.completions.create>[0]['messages'],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: this.config.model,
      tokensUsed: response.usage?.total_tokens,
      finishReason: response.choices[0]?.finish_reason,
    };
  }

  /**
   * Chat with Ollama (local)
   */
  private async chatOllama(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        stream: false,
      }),
    });

    const data = (await response.json()) as {
      message: { content: string };
      model: string;
    };

    return {
      content: data.message.content,
      model: data.model,
    };
  }

  /**
   * Chat with Groq
   */
  private async chatGroq(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey || process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
      }),
    });

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      tokensUsed: data.usage?.total_tokens,
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  /**
   * Chat with Together AI
   */
  private async chatTogether(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey || process.env.TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
      }),
    });

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      tokensUsed: data.usage?.total_tokens,
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  /**
   * Chat with Perplexity
   */
  private async chatPerplexity(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey || process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
      }),
    });

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      tokensUsed: data.usage?.total_tokens,
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  /**
   * Stream chat response (for real-time updates)
   */
  async *chatStream(
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    if (this.config.provider !== 'openai' && !this.config.baseUrl) {
      throw new Error('Streaming only supported for OpenAI-compatible APIs');
    }

    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    const stream = await this.openaiClient.chat.completions.create({
      model: this.config.model,
      messages: allMessages as Parameters<typeof this.openaiClient.chat.completions.create>[0]['messages'],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export default CustomModelService;
