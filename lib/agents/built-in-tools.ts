import { Tool } from './agent-service';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Web search tool using DuckDuckGo
 */
export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information. Returns a list of search results with titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  execute: async (input: Record<string, any>) => {
    const query = input.query as string;
    const numResults = input.num_results || 5;

    try {
      const url = new URL('https://html.duckduckgo.com/html/');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0)',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(query)}`,
      });

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const results: Array<{ title: string; url: string; snippet: string }> = [];

      const resultElements = document.querySelectorAll('.result');
      for (let i = 0; i < Math.min(resultElements.length, numResults); i++) {
        const element = resultElements[i];
        const titleEl = element.querySelector('.result__title');
        const urlEl = element.querySelector('.result__url');
        const snippetEl = element.querySelector('.result__snippet');

        if (titleEl && urlEl) {
          results.push({
            title: titleEl.textContent || '',
            url: urlEl.textContent || '',
            snippet: snippetEl?.textContent || '',
          });
        }
      }

      if (results.length === 0) {
        return 'No search results found.';
      }

      return results
        .map((r, i) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`)
        .join('\n\n');
    } catch (error) {
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Fetch page content tool
 */
export const fetchPageTool: Tool = {
  name: 'fetch_page',
  description: 'Fetch and extract text content from a web page. Useful for reading full articles after finding them with web_search.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the page to fetch',
      },
      max_length: {
        type: 'number',
        description: 'Maximum characters to return (default: 8000)',
      },
    },
    required: ['url'],
  },
  execute: async (input: Record<string, any>) => {
    const url = input.url as string;
    const maxLength = input.max_length || 8000;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0)',
        },
      });

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Remove scripts, styles, nav, footer, header
      const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header');
      elementsToRemove.forEach((el) => el.remove());

      // Extract text
      let text = document.body?.textContent || '';
      text = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');

      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '\n\n[Content truncated]';
      }

      return text;
    } catch (error) {
      return `Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Write file tool
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file. Useful for saving reports or results.',
  inputSchema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'The name of the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write',
      },
      append: {
        type: 'boolean',
        description: 'Whether to append to existing file (default: false)',
      },
    },
    required: ['filename', 'content'],
  },
  execute: async (input: Record<string, any>) => {
    const filename = input.filename as string;
    const content = input.content as string;
    const append = input.append || false;

    try {
      const filepath = join(process.cwd(), 'output', filename);

      if (append) {
        const existing = await readFile(filepath, 'utf-8').catch(() => '');
        await writeFile(filepath, existing + content, 'utf-8');
      } else {
        await writeFile(filepath, content, 'utf-8');
      }

      return `Successfully written to ${filename}`;
    } catch (error) {
      return `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Read file tool
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read content from a file.',
  inputSchema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'The name of the file to read',
      },
    },
    required: ['filename'],
  },
  execute: async (input: Record<string, any>) => {
    const filename = input.filename as string;

    try {
      const filepath = join(process.cwd(), 'output', filename);
      const content = await readFile(filepath, 'utf-8');
      return content;
    } catch (error) {
      return `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Get all built-in tools
 */
export function getBuiltInTools(): Tool[] {
  return [webSearchTool, fetchPageTool, writeFileTool, readFileTool];
}

export default {
  webSearchTool,
  fetchPageTool,
  writeFileTool,
  readFileTool,
  getBuiltInTools,
};
