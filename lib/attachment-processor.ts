/**
 * Attachment Processor
 * 
 * Processes various attachment types for chat context:
 * - Files (text, code, documents)
 * - Images (with description)
 * - Links (with content extraction)
 * - Videos (metadata)
 */

import { Attachment } from "./chat-store";
import { readFileContent, summarizeFileContent } from "./file-reader";
import { readLinkContent, summarizeLinkContent } from "./link-reader";

export interface AttachmentContext {
  attachment: Attachment;
  content: string;
  summary: string;
  context: string; // For AI context
}

export interface ProcessOptions {
  extractContent?: boolean;
  maxContentLength?: number;
  includeMetadata?: boolean;
}

/**
 * Process an attachment to extract content and context for the chat AI
 */
export async function processAttachment(
  attachment: Attachment,
  options: ProcessOptions = {},
): Promise<AttachmentContext> {
  const {
    extractContent = true,
    maxContentLength = 5000,
    includeMetadata = true,
  } = options;

  let content = "";
  let summary = "";

  switch (attachment.type) {
    case "file": {
      // If it's already a data URL, try to extract content
      if (attachment.url.startsWith("data:")) {
        // Fallback for direct data URL decoding in the browser/server context
        const dataContent = attachment.url.split(',')[1] ? atob(attachment.url.split(',')[1]).slice(0, 10000) : "";
        summary = `📄 **${attachment.name}** (${attachment.mimeType || "file"})`;
        content = extractContent ? dataContent : "";
      } else {
        if (attachment.url.startsWith('blob:')) {
          summary = `📄 **${attachment.name}** (Upload Pending)`;
          content = "[File content is not yet available on the server. Please wait for the upload to complete.]";
        } else {
        // It's a file path or ID
        summary = `📄 **${attachment.name}**`;
        if (includeMetadata && attachment.size) {
          summary += ` - ${(attachment.size / 1024).toFixed(2)}KB`;
        }
        content = summary;
        }
      }
      break;
    }

    case "image": {
      const isBlob = attachment.url.startsWith('blob:');
      summary = `🖼️ **${attachment.name}** (Image${isBlob ? ' - Local' : ''})`;
      if (includeMetadata && attachment.size) {
        summary += ` - ${(attachment.size / 1024).toFixed(2)}KB`;
      }
      // Image content should be handled by Claude vision
      content = `[Image attached: ${attachment.name}${isBlob ? ' (Warning: Local preview only)' : ''}] Use vision capabilities to analyze this image if needed.`;
      break;
    }

    case "link": {
      if (extractContent) {
        try {
          const linkContent = await readLinkContent(attachment.url, {
            maxSize: 10 * 1024 * 1024,
            timeout: 5000,
          });
          summary = `🔗 **${linkContent.title || attachment.name || attachment.url}**`;
          if (linkContent.description) {
            summary += `\n${linkContent.description}`;
          }
          content = linkContent.content.substring(0, maxContentLength);
        } catch (err: any) {
          summary = `🔗 **${attachment.name || attachment.url}** (Link)`;
          content = `Failed to fetch: ${err.message}`;
        }
      } else {
        summary = `🔗 **${attachment.name || attachment.url}**`;
        content = attachment.url;
      }
      break;
    }

    case "video": {
      summary = `🎥 **${attachment.name}** (Video)`;
      if (includeMetadata && attachment.size) {
        summary += ` - ${(attachment.size / 1024).toFixed(2)}KB`;
      }
      content = `[Video attached: ${attachment.name}]\nNote: Claude cannot currently process video files. Please provide a description of the video content or share key frames as images.`;
      break;
    }

    default: {
      summary = `📎 **${attachment.name}**`;
      content = attachment.url;
    }
  }

  return {
    attachment,
    content,
    summary,
    context: buildAttachmentContext(attachment, content),
  };
}

/**
 * Process multiple attachments
 */
export async function processAttachments(
  attachments: Attachment[],
  options: ProcessOptions = {},
): Promise<AttachmentContext[]> {
  return Promise.all(
    attachments.map((att) => processAttachment(att, options)),
  );
}

/**
 * Build context string for AI from attachment
 */
function buildAttachmentContext(
  attachment: Attachment,
  content: string,
): string {
  let context = "";

  if (attachment.type === "file") {
    context = `File attached: ${attachment.name}`;
    if (attachment.language) {
      context += ` (${attachment.language})`;
    }
    context += "\n\nContent preview:\n" + content.substring(0, 1000);
  } else if (attachment.type === "image") {
    context = `Image attached: ${attachment.name}`;
  } else if (attachment.type === "link") {
    context = `Web link attached: ${attachment.url}\n\n${content.substring(0, 1000)}`;
  } else if (attachment.type === "video") {
    context = `Video attached: ${attachment.name}`;
  } else {
    context = `Attachment: ${attachment.name}`;
  }

  return context;
}

/**
 * Create a formatted message with attachments for the AI
 */
export async function formatMessageWithAttachments(
  message: string,
  attachments?: Attachment[],
  options: ProcessOptions = {},
): Promise<{ formattedMessage: string; attachmentContexts: AttachmentContext[] }> {
  const attachmentContexts: AttachmentContext[] = [];

  if (!attachments || attachments.length === 0) {
    return {
      formattedMessage: message,
      attachmentContexts: [],
    };
  }

  // Process all attachments
  for (const att of attachments) {
    const ctx = await processAttachment(att, options);
    attachmentContexts.push(ctx);
  }

  // Build formatted message
  let formattedMessage = message;

  // Add attachment summaries
  const summaries = attachmentContexts.map((ctx) => ctx.summary).join("\n");
  if (summaries) {
    formattedMessage = `${message}\n\n---\n**Attachments:**\n${summaries}`;
  }

  // Add content for files and links
  const contentParts: string[] = [];
  for (const ctx of attachmentContexts) {
    if (ctx.attachment.type === "file" || ctx.attachment.type === "link") {
      if (ctx.content && !ctx.content.startsWith("[")) {
        contentParts.push(`**${ctx.attachment.name}:**\n\`\`\`\n${ctx.content}\n\`\`\``);
      }
    }
  }

  if (contentParts.length > 0) {
    formattedMessage += `\n\n**Content:**\n${contentParts.join("\n\n")}`;
  }

  return {
    formattedMessage,
    attachmentContexts,
  };
}

/**
 * Validate attachment URL is accessible
 */
export async function validateAttachment(
  attachment: Attachment,
  timeout: number = 5000,
): Promise<{ valid: boolean; error?: string }> {
  if (attachment.type === "link") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(attachment.url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return { valid: response.ok };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  // For other types, assume valid if URL is present
  return { valid: !!attachment.url };
}

/**
 * Batch validate attachments
 */
export async function validateAttachments(
  attachments: Attachment[],
  timeout: number = 5000,
): Promise<Map<string, { valid: boolean; error?: string }>> {
  const results = new Map<string, { valid: boolean; error?: string }>();

  for (const att of attachments) {
    const result = await validateAttachment(att, timeout);
    results.set(att.id, result);
  }

  return results;
}

/**
 * Get display text for attachment type
 */
export function getAttachmentTypeDisplay(type: Attachment["type"]): string {
  const displayMap: Record<Attachment["type"], string> = {
    file: "📄 File",
    image: "🖼️ Image",
    link: "🔗 Link",
    video: "🎥 Video",
  };
  return displayMap[type] || "📎 Attachment";
}
