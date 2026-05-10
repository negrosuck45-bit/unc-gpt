'use client';
import { useMemo, useState, useCallback } from 'react';
import { CodeBlock } from './code-block';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MessageContentProps {
  content: string | undefined | null;
}

interface ContentPart {
  type: 'text' | 'code' | 'image';
  content: string;
  language?: string;
  alt?: string;
}

// Enhanced formatText function to handle markdown links and formatting
function formatText(text: string | undefined | null): string {
  if (typeof text !== 'string' || !text.trim()) {
    return '';
  }

  let formatted = text
    // Escaping some HTML characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline inline-flex items-center gap-1">$1 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>')
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-accent text-sm font-mono border border-border/50">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br />');

  return formatted;
}

function parseContent(content: string | undefined | null): ContentPart[] {
  if (typeof content !== 'string' || !content.trim()) {
    return [{ type: 'text', content: '' }];
  }

  const parts: ContentPart[] = [];
  // Match code blocks and markdown images
  // We exclude markdown links from the main regex to handle them inside formatText
  const regex = /```(\w+)?\n([\s\S]*?)```|!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }

    if (match[0].startsWith('```')) {
      // Code block
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim(),
      });
    } else {
      // Markdown image: ![alt](url)
      parts.push({
        type: 'image',
        alt: match[3] || 'Generated Image',
        content: match[4], // URL
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', content: text });
  }

  // Fallback if no parts found
  return parts.length > 0 ? parts : [{ type: 'text', content: content.trim() }];
}

function ImageWithLoader({ src, alt }: { src: string; alt: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download image');
    }
  }, [src]);

  if (error) {
    return (
      <div className="my-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        Failed to load image. It may still be generating.
      </div>
    );
  }

  return (
    <div className="my-3 relative group" style={{ willChange: 'transform' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 rounded-xl border border-border">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Generating image...</span>
          </div>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        className="rounded-xl max-w-full h-auto border border-border shadow-lg transition-opacity duration-300"
        style={{ maxHeight: '512px', opacity: loading ? 0 : 1 }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        loading="lazy"
      />

      {!loading && !error && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
            title="Download image"
          >
            <Download className="w-4 h-4" />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

export function MessageContent({ content }: MessageContentProps) {
  const parts = useMemo(() => parseContent(content), [content]);

  // Separate images from other content for layout optimization
  const images = useMemo(() => parts.filter(p => p.type === 'image'), [parts]);
  const otherParts = useMemo(() => parts.filter(p => p.type !== 'image'), [parts]);

  return (
    <div className="space-y-2">
      {/* Images displayed as horizontal thumbnails above text */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2" style={{ willChange: 'transform' }}>
          {images.map((part, index) => (
            <div key={`img-${index}`} className="flex-shrink-0">
              <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                <img
                  src={part.content}
                  alt={part.alt || 'Image'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
                  <a
                    href={part.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
                    title="View full image"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other content (text, code) */}
      {otherParts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={`code-${index}`}
              code={part.content}
              language={part.language}
            />
          );
        }

        // Text part
        return (
          <p
            key={`text-${index}`}
            className="text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatText(part.content) }}
          />
        );
      })}
    </div>
  );
}
