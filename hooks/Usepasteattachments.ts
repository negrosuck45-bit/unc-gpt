import { useCallback } from 'react';
import { Attachment } from '@/lib/chat-store';

interface PasteResult {
  content: string; // Text to keep in message (or empty)
  attachments: Attachment[];
}

export function usePasteAttachments() {
  const detectCodeBlock = useCallback((text: string): { isCode: boolean; code: string; language: string } => {
    // Check for markdown code blocks
    const codeBlockMatch = text.match(/^```(\w*)\n([\s\S]*?)\n```$/);
    if (codeBlockMatch) {
      return {
        isCode: true,
        code: codeBlockMatch[2],
        language: codeBlockMatch[1] || 'text'
      };
    }

    // Check for indented code (4+ spaces)
    if (text.match(/^    /m)) {
      return {
        isCode: true,
        code: text,
        language: 'text'
      };
    }

    // Check for common code indicators (import, function, const, etc.)
    const codeIndicators = /^(import|export|function|const|let|var|class|interface|type|async|await|return|if|for|while)/m;
    if (text.trim().length > 20 && codeIndicators.test(text)) {
      return {
        isCode: true,
        code: text,
        language: 'javascript'
      };
    }

    return { isCode: false, code: '', language: '' };
  }, []);

  const detectDocument = useCallback((text: string): { isDocument: boolean; title: string } => {
    // Check for JSON
    try {
      JSON.parse(text);
      return { isDocument: true, title: 'JSON Document' };
    } catch { }

    // Check for YAML-like structure
    if (text.match(/^[\w-]+:\s+/m)) {
      return { isDocument: true, title: 'Configuration File' };
    }

    // Check for markdown headings
    if (text.match(/^#{1,6}\s+/m)) {
      return { isDocument: true, title: 'Markdown Document' };
    }

    // Check for HTML
    if (text.match(/<[a-z][\s\S]*>/i)) {
      return { isDocument: true, title: 'HTML Document' };
    }

    // Check for SQL
    if (text.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/i)) {
      return { isDocument: true, title: 'SQL Document' };
    }

    return { isDocument: false, title: '' };
  }, []);

  const handlePaste = useCallback(
    (text: string): PasteResult => {
      const trimmed = text.trim();
      const attachments: Attachment[] = [];
      let contentToKeep = '';

      // Try to detect code block
      const codeDetection = detectCodeBlock(trimmed);
      if (codeDetection.isCode) {
        const codeContent = codeDetection.code;
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'file',
          name: `code.${codeDetection.language}`,
          url: `data:text/plain;base64,${btoa(codeContent)}`,
          mimeType: 'text/plain',
          size: codeContent.length
        };
        attachments.push(attachment);
        // Don't keep the code in message text
      } else {
        // Try to detect document
        const docDetection = detectDocument(trimmed);
        if (docDetection.isDocument) {
          const attachment: Attachment = {
            id: crypto.randomUUID(),
            type: 'file',
            name: docDetection.title,
            url: `data:text/plain;base64,${btoa(trimmed)}`,
            mimeType: 'text/plain',
            size: trimmed.length
          };
          attachments.push(attachment);
          // Don't keep the document in message text
        } else {
          // Regular text, keep it
          contentToKeep = text;
        }
      }

      return {
        content: contentToKeep,
        attachments
      };
    },
    [detectCodeBlock, detectDocument]
  );

  return { handlePaste };
}