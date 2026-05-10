# Enhancement Update — Neural Memory & File/Link Support

## Overview

This update adds powerful new capabilities to enhance the AI chat experience:

1. **Fixed & Enhanced Video Generation** — Multiple fallback providers
2. **File Reading** — Support for text, code, and documents
3. **Link/URL Reading** — Web content extraction and parsing
4. **Enhanced Neural Memory System** — Advanced lifecycle management
5. **Attachment Processing** — Unified handling for files, images, links, videos

---

## 1. Video Generation Fixes

### What's New

- **Multiple Fallback Providers**: If one video generation service fails, automatically tries alternatives
  - Pollinations FastSVD (primary)
  - Pollinations SVD-XT (secondary)
  - HuggingFace Zero-Shot Video (tertiary)

- **Better Error Handling**: Clear error messages about which providers failed and why

- **Improved Timeout Management**: Proper cleanup and resource handling

### Usage

**Route**: `/api/imagine`

```typescript
const response = await fetch("/api/imagine", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    task: "video",
    prompt: "A cat walking through a field at sunset",
  }),
});

const { url, model, mimeType } = await response.json();
```

### File

- [app/api/imagine/route.ts](app/api/imagine/route.ts)

---

## 2. File Reading Utilities

### What's New

- **Multiple File Type Support**:
  - Text files (`.txt`, `.md`, `.log`, `.yml`, etc.)
  - Code files (`.js`, `.ts`, `.py`, `.java`, `.cpp`, etc.)
  - JSON & CSV with structure preservation
  - Images (with metadata)
  - Documents (PDF, DOCX placeholders for library integration)
  - Archives (ZIP, TAR, RAR placeholders)

- **Automatic Language Detection**: Code files detect programming language
- **Content Preview**: Summarizes file content for chat context
- **Size Limiting**: Prevents loading files larger than 50MB

### Usage

```typescript
import { readFileContent, summarizeFileContent } from "@/lib/file-reader";

const file = new File(["console.log('hello');"], "script.js", {
  type: "text/javascript",
});

const fileContent = await readFileContent(file, "script.js");
console.log(fileContent.type); // "code"
console.log(fileContent.metadata?.language); // "javascript"

const summary = summarizeFileContent(fileContent, 2000);
```

### API

```typescript
interface FileContent {
  type: "text" | "image" | "code" | "document" | "archive" | "unknown";
  content: string;
  filename: string;
  mimeType: string;
  size: number;
  encoding?: string;
  metadata?: Record<string, any>;
}

async function readFileContent(
  file: File | Blob,
  filename: string,
  options?: {
    maxSize?: number; // default 50MB
    encoding?: string; // default "utf-8"
    parseStructure?: boolean; // for documents
  }
): Promise<FileContent>;

async function readFilesContent(files: File[], options?: ReadFileOptions): Promise<FileContent[]>;

function summarizeFileContent(fileContent: FileContent, maxChars?: number): string;
```

### File

- [lib/file-reader.ts](lib/file-reader.ts)

---

## 3. Link/URL Reading Utilities

### What's New

- **Content Extraction**: Fetches and parses web pages
- **Metadata Parsing**: Extracts title, description, Open Graph tags
- **HTML to Text Conversion**: Intelligent extraction of readable content
- **API Support**: Handles JSON APIs with proper formatting
- **Media Detection**: Identifies images, videos, audio files
- **Timeout & Size Limits**: Safe fetching with 10s timeout and 10MB limit

### Usage

```typescript
import { readLinkContent, summarizeLinkContent } from "@/lib/link-reader";

const linkContent = await readLinkContent("https://example.com");

console.log(linkContent.title);
console.log(linkContent.description);
console.log(linkContent.content); // First 50KB of text

const summary = summarizeLinkContent(linkContent, 2000);
```

### API

```typescript
interface LinkContent {
  type: "webpage" | "json" | "api" | "media" | "unknown";
  content: string;
  url: string;
  title?: string;
  description?: string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, any>;
}

async function readLinkContent(
  url: string,
  options?: {
    maxSize?: number; // default 10MB
    timeout?: number; // default 10s
    followRedirects?: boolean;
    parseMetadata?: boolean;
  }
): Promise<LinkContent>;

async function previewLink(url: string, options?: ReadLinkOptions): Promise<{
  valid: boolean;
  title?: string;
  description?: string;
  error?: string;
}>;

function summarizeLinkContent(linkContent: LinkContent, maxChars?: number): string;
```

### File

- [lib/link-reader.ts](lib/link-reader.ts)

---

## 4. Enhanced Neural Memory System

### What's New

- **Advanced Lifecycle Management**:
  - Decay: Memories lose importance over time if not accessed
  - Prune: Low-importance memories are removed
  - Merge: Similar memories are combined
  - Abstract: Related memories are summarized

- **Relationship Tracking**: Memories can reference related memories
- **Context Awareness**: Each memory can store additional context
- **Statistics & Metrics**: Track memory health and usage
- **Batch Operations**: Process multiple memories efficiently
- **Tag-based Search**: Find memories by tags and content

- **Enhanced Entry Types**:
  - `fact`: Static information
  - `conversation`: Chat exchanges
  - `instruction`: Guidelines and procedures
  - `note`: General notes
  - `summary`: Auto-generated summaries
  - `context`: Background information
  - `relationship`: Memory relationships

### Configuration

```typescript
const config: NeuralConfig = {
  decayRate: 0.05, // 5% importance lost per day
  decayThreshold: 0.05, // Prune if below 5% importance
  mergeSimilarityThreshold: 0.92, // Merge if 92% similar
  autoMaintenanceInterval: 50, // Run maintenance every 50 stores
  recencyHalfLifeDays: 7, // Recency decays by half every 7 days
  weights: {
    relevance: 0.5, // 50% of score from relevance
    importance: 0.3, // 30% of score from importance
    recency: 0.2, // 20% of score from recency
  },
  maxMemories: 10000,
  relationshipDepth: 2,
};
```

### Key Functions

```typescript
// Store and maintain
reinforceMemory(entry, strengthFactor): Enhanced memory
runNeuralMaintenance(entries, config): Lifecycle management

// Retrieve intelligently
retrieveWithNeuralScoring(entries, scores, config, topK): Top memories
retrieveWithRelationships(entries, scores, config, topK, depth): Expanded retrieval
searchMemories(entries, query, config, topK): Content search

// Organize
findByTag(entries, tag): Get memories with tag
findByType(entries, type): Get memories of type
calculateMemoryStats(entries, stats): Stats about memories
```

### File

- [lib/neural-memory.ts](lib/neural-memory.ts)

---

## 5. Attachment Processing

### What's New

- **Unified Attachment Handler**: Single interface for all attachment types
- **Content Extraction**: Automatically extracts and prepares content for AI
- **Validation**: Checks attachment accessibility
- **Context Building**: Creates formatted context for chat AI
- **Type Detection**: Automatic handling based on attachment type

### Attachment Types

```typescript
interface Attachment {
  id: string;
  type: "image" | "video" | "file" | "link";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  language?: string; // for code files
}
```

### Usage

```typescript
import {
  processAttachment,
  formatMessageWithAttachments,
  validateAttachments,
} from "@/lib/attachment-processor";

// Process single attachment
const context = await processAttachment(attachment);
console.log(context.summary); // "🔗 Example Website | Description"
console.log(context.context); // Content formatted for AI

// Format message with attachments
const { formattedMessage, attachmentContexts } =
  await formatMessageWithAttachments(
    "What's in this file?",
    [fileAttachment, linkAttachment],
    { extractContent: true, maxContentLength: 5000 }
  );

// Validate attachments
const validations = await validateAttachments(attachments);
for (const [id, result] of validations) {
  if (!result.valid) {
    console.error(`Attachment ${id}: ${result.error}`);
  }
}
```

### API

```typescript
interface AttachmentContext {
  attachment: Attachment;
  content: string;
  summary: string;
  context: string; // For AI context
}

async function processAttachment(
  attachment: Attachment,
  options?: ProcessOptions
): Promise<AttachmentContext>;

async function processAttachments(
  attachments: Attachment[],
  options?: ProcessOptions
): Promise<AttachmentContext[]>;

async function formatMessageWithAttachments(
  message: string,
  attachments?: Attachment[],
  options?: ProcessOptions
): Promise<{
  formattedMessage: string;
  attachmentContexts: AttachmentContext[];
}>;

async function validateAttachment(
  attachment: Attachment,
  timeout?: number
): Promise<{ valid: boolean; error?: string }>;

async function validateAttachments(
  attachments: Attachment[],
  timeout?: number
): Promise<Map<string, { valid: boolean; error?: string }>>;
```

### File

- [lib/attachment-processor.ts](lib/attachment-processor.ts)

---

## Integration with Chat API

The chat API can now use these utilities to:

1. **Process file attachments** before sending to Claude
2. **Extract web content** from links automatically
3. **Use neural memory** to retrieve relevant past conversations
4. **Handle video generation** with fallbacks

### Example Enhancement

```typescript
// In chat API route
const { formatMessageWithAttachments } = await import(
  "@/lib/attachment-processor"
);

// When processing user message with attachments
const { formattedMessage, attachmentContexts } =
  await formatMessageWithAttachments(userMessage, attachments);

// Use formatted message for Claude
const response = await claudeAPI.messages.create({
  messages: [
    {
      role: "user",
      content: formattedMessage,
    },
  ],
});
```

---

## Files Added/Modified

### New Files

- [lib/file-reader.ts](lib/file-reader.ts) — File content extraction
- [lib/link-reader.ts](lib/link-reader.ts) — URL content extraction
- [lib/attachment-processor.ts](lib/attachment-processor.ts) — Unified attachment handling

### Modified Files

- [lib/neural-memory.ts](lib/neural-memory.ts) — Enhanced with new features
- [app/api/imagine/route.ts](app/api/imagine/route.ts) — Fixed video generation

---

## Future Enhancements

1. **PDF Support** — Install `pdf-parse` for PDF extraction
2. **DOCX Support** — Install `docx` for document parsing
3. **OCR for Images** — Integrate Claude vision API for image text extraction
4. **Archive Extraction** — Support ZIP/TAR extraction
5. **Embedding Generation** — Use Claude embeddings for better similarity
6. **Vector Database** — Integrate with ChromaDB for memory storage
7. **Streaming Support** — Async generators for large file processing

---

## Testing

### Quick Test: File Reader

```bash
# Test file reading
import { readFileContent } from "@/lib/file-reader";

const file = new File(["test content"], "test.txt");
const result = await readFileContent(file, "test.txt");
console.log(result); // FileContent object
```

### Quick Test: Link Reader

```bash
# Test link reading
import { readLinkContent } from "@/lib/link-reader";

const content = await readLinkContent("https://example.com");
console.log(content.title);
console.log(content.content.substring(0, 200));
```

### Quick Test: Neural Memory

```bash
# Test neural memory
import {
  runNeuralMaintenance,
  retrieveWithNeuralScoring,
  calculateMemoryStats,
} from "@/lib/neural-memory";

const memories = [
  {
    id: "1",
    content: "User prefers concise responses",
    importance: 0.9,
    timestamp: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 5,
    type: "fact" as const,
  },
];

const stats = calculateMemoryStats(memories);
console.log(stats);
```

---

## Configuration & Environment

No additional environment variables needed. All utilities work with default configurations:

- **File Reader**: 50MB max, UTF-8 encoding
- **Link Reader**: 10MB max, 10s timeout
- **Neural Memory**: Configurable, sensible defaults provided
- **Attachment Processor**: Uses above utilities with standard options

---

## Performance Notes

- File reading is optimized for reasonable file sizes (< 50MB)
- Link fetching has timeout protection and caches metadata
- Neural maintenance runs periodically and doesn't block chat
- Batch operations process files in parallel for efficiency
- Memory usage stays bounded with pruning and decay

---

## Troubleshooting

### Video Generation Fails

Try the following in order:
1. Check internet connection
2. Verify prompt is reasonable
3. Try image generation instead (fallback)
4. Check service status (Pollinations, HuggingFace)

### File Too Large Error

Increase `maxSize` in options:

```typescript
const content = await readFileContent(file, name, { maxSize: 100 * 1024 * 1024 });
```

### Link Fetch Times Out

Increase `timeout` in options:

```typescript
const content = await readLinkContent(url, { timeout: 20000 });
```

### Memory Stats Show Low Importance

Run maintenance to decay and prune:

```typescript
const { result, stats } = runNeuralMaintenance(memories, config);
```

---

## Support

For issues or questions:
1. Check the file docs in each utility
2. Review the TypeScript interfaces
3. Test utilities independently first
4. Check console logs for detailed error messages
