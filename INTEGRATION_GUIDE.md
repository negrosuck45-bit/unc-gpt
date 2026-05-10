# Integration Guide — Using New Features in Chat

## Quick Start

Here's how to integrate the new file/link/memory features into your chat application:

---

## 1. Adding File Upload Support

### In Chat Input Component

```typescript
import { readFileContent, summarizeFileContent } from "@/lib/file-reader";
import { Attachment } from "@/lib/chat-store";

async function handleFileUpload(files: File[]) {
  const attachments: Attachment[] = [];

  for (const file of files) {
    try {
      // Read file content
      const fileContent = await readFileContent(file, file.name);

      // Create attachment
      const attachment: Attachment = {
        id: `file-${Date.now()}-${Math.random()}`,
        type: "file",
        name: file.name,
        url: await uploadFile(file), // Use existing upload utility
        size: file.size,
        mimeType: file.type,
        language: fileContent.metadata?.language,
      };

      attachments.push(attachment);

      // Show preview
      console.log(summarizeFileContent(fileContent, 500));
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err);
    }
  }

  return attachments;
}
```

---

## 2. Adding Link/URL Support

### In Chat Input Component

```typescript
import { readLinkContent } from "@/lib/link-reader";
import { Attachment } from "@/lib/chat-store";

async function handleLinkPaste(url: string) {
  try {
    // Validate and fetch link
    const linkContent = await readLinkContent(url);

    const attachment: Attachment = {
      id: `link-${Date.now()}`,
      type: "link",
      name: linkContent.title || new URL(url).hostname,
      url: url,
      mimeType: linkContent.contentType,
    };

    return attachment;
  } catch (err) {
    console.error(`Failed to process link:`, err);
    return null;
  }
}

// Hook for detecting URLs in paste events
function useUrlDetection() {
  return {
    extractUrls: (text: string): string[] => {
      const urlRegex =
        /(https?:\/\/[^\s]+)/g;
      return (text.match(urlRegex) || []).filter(
        (url) => url.length > 10 && !url.includes(")("),
      );
    },
  };
}
```

---

## 3. Processing Attachments Before Sending

### In Chat Send Handler

```typescript
import {
  formatMessageWithAttachments,
  validateAttachments,
} from "@/lib/attachment-processor";

async function sendMessageWithAttachments(
  message: string,
  attachments?: Attachment[],
) {
  // Validate attachments
  if (attachments && attachments.length > 0) {
    const validations = await validateAttachments(attachments, 5000);
    for (const [id, result] of validations) {
      if (!result.valid) {
        throw new Error(`Attachment ${id} is not accessible: ${result.error}`);
      }
    }
  }

  // Format message with attachment content
  const { formattedMessage, attachmentContexts } =
    await formatMessageWithAttachments(message, attachments, {
      extractContent: true,
      maxContentLength: 3000,
      includeMetadata: true,
    });

  // Send to chat API
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: formattedMessage },
      ],
      attachmentContexts, // Pass for additional processing
    }),
  });

  return response.json();
}
```

---

## 4. Using Neural Memory in Chat

### Initialize Memory

```typescript
import {
  NeuralMemoryEntry,
  DEFAULT_NEURAL_CONFIG,
  runNeuralMaintenance,
  searchMemories,
} from "@/lib/neural-memory";

class ChatMemoryManager {
  private memories: NeuralMemoryEntry[] = [];
  private storeCount = 0;

  addMemory(
    content: string,
    type: NeuralMemoryEntry["type"],
    importance: number = 0.7,
    tags?: string[],
  ) {
    const memory: NeuralMemoryEntry = {
      id: `mem-${Date.now()}`,
      content,
      importance,
      timestamp: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      type,
      tags,
    };

    this.memories.push(memory);
    this.storeCount++;

    // Run maintenance every N stores
    if (this.storeCount % DEFAULT_NEURAL_CONFIG.autoMaintenanceInterval === 0) {
      this.runMaintenance();
    }

    return memory;
  }

  searchRelevantMemories(query: string, topK: number = 5) {
    return searchMemories(this.memories, query, DEFAULT_NEURAL_CONFIG, topK);
  }

  runMaintenance() {
    const { result, stats } = runNeuralMaintenance(
      this.memories,
      DEFAULT_NEURAL_CONFIG,
    );
    this.memories = result;
    console.log("[Memory] Maintenance complete:", stats);
  }
}
```

### Use Memory in Chat

```typescript
async function sendChatMessage(message: string) {
  const memoryManager = new ChatMemoryManager();

  // Find relevant memories
  const relevantMemories = memoryManager.searchRelevantMemories(message, 3);

  // Build context
  let context = "";
  if (relevantMemories.length > 0) {
    context = `\n\nRelevant context from memory:\n${relevantMemories
      .map((m) => `- ${m.content}`)
      .join("\n")}`;
  }

  // Add to message
  const enhancedMessage = message + context;

  // Send and store response
  const response = await chatAPI.send(enhancedMessage);

  // Store important info in memory
  memoryManager.addMemory(
    message,
    "conversation",
    0.7,
    message.split(/\s+/).slice(0, 5),
  );

  if (response.length > 100) {
    memoryManager.addMemory(
      response.substring(0, 500),
      "conversation",
      0.6,
    );
  }

  return response;
}
```

---

## 5. UI Integration Example

### Updated Chat Input Component

```typescript
import React, { useState } from "react";
import { Attachment } from "@/lib/chat-store";

export function ChatInputWithAttachments() {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesSelected = async (files: FileList) => {
    setIsLoading(true);
    try {
      const newAttachments = await handleFileUpload(Array.from(files));
      setAttachments([...attachments, ...newAttachments]);
    } catch (err) {
      console.error("File upload failed:", err);
      alert("Failed to process files");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    // Check for URLs
    const text = e.clipboardData.getData("text");
    const urls = extractUrls(text);

    for (const url of urls) {
      const linkAtt = await handleLinkPaste(url);
      if (linkAtt) {
        setAttachments([...attachments, linkAtt]);
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    setIsLoading(true);
    try {
      await sendMessageWithAttachments(message, attachments);
      setMessage("");
      setAttachments([]);
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-input-container">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((att) => (
            <div key={att.id} className="attachment-preview">
              <span>{getAttachmentIcon(att.type)} {att.name}</span>
              <button
                onClick={() =>
                  setAttachments(attachments.filter((a) => a.id !== att.id))
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="input-row">
        {/* File upload button */}
        <label className="file-upload">
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            style={{ display: "none" }}
          />
          📎
        </label>

        {/* Text input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          placeholder="Type message, paste links, or attach files..."
          disabled={isLoading}
        />

        {/* Send button */}
        <button onClick={handleSend} disabled={isLoading || (!message && attachments.length === 0)}>
          {isLoading ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}

function getAttachmentIcon(type: Attachment["type"]): string {
  const icons = {
    file: "📄",
    image: "🖼️",
    link: "🔗",
    video: "🎥",
  };
  return icons[type] || "📎";
}

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (text.match(urlRegex) || []).filter((url) => !url.endsWith(")") && url.length > 10);
}
```

---

## 6. Chat API Updates

### Update `/api/chat` to handle attachments

```typescript
import {
  formatMessageWithAttachments,
  AttachmentContext,
} from "@/lib/attachment-processor";
import { searchMemories } from "@/lib/neural-memory";

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      attachments,
      model,
      provider,
    } = await req.json();

    // Process attachments
    let finalMessages = messages;
    if (attachments && attachments.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        const { formattedMessage } = await formatMessageWithAttachments(
          lastMessage.content,
          attachments,
          { extractContent: true, maxContentLength: 5000 },
        );

        finalMessages = [
          ...messages.slice(0, -1),
          { role: "user", content: formattedMessage },
        ];
      }
    }

    // Get relevant memories (if using neural memory)
    let memoryContext = "";
    if (messages.length > 0) {
      const recentMemories = searchMemories(
        globalMemories, // Your memory store
        messages[messages.length - 1].content,
        DEFAULT_NEURAL_CONFIG,
        3,
      );

      if (recentMemories.length > 0) {
        memoryContext = `\n\nRelevant previous context:\n${recentMemories
          .map((m) => `- ${m.content.substring(0, 100)}`)
          .join("\n")}`;
      }
    }

    // Send to Claude/API
    const response = await callLLM({
      messages: finalMessages,
      memoryContext,
      model,
      provider,
    });

    // Store in memory if important
    if (response.length > 100) {
      globalMemories.push({
        id: `resp-${Date.now()}`,
        content: response.substring(0, 500),
        importance: 0.5,
        timestamp: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        type: "conversation",
      });
    }

    return Response.json(response);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 7. Environment & Testing

### Test File Processing

```bash
# Create a test file
echo "This is a test file" > test.txt

# Load in chat and test
```

### Test Link Processing

```bash
# Paste any URL in chat
# https://example.com

# Should automatically fetch and extract content
```

### Test Memory

```typescript
// Check memory stats
console.log(memoryManager.getStats());

// Search for specific memories
const results = memoryManager.searchRelevantMemories("deadline", 5);
console.log(results);
```

---

## Features Checklist

- ✅ **File Upload & Reading** — Text, code, images
- ✅ **Link Extraction** — URLs to text content
- ✅ **Video Generation** — With fallbacks
- ✅ **Neural Memory** — Decay, prune, merge
- ✅ **Attachment Processing** — Unified handling
- ✅ **Chat Integration** — Full pipeline
- ⚠️ **Document Support** — Needs library (PDF parse, DOCX)
- ⚠️ **OCR** — Needs Claude vision integration
- ⚠️ **Archive Extraction** — Needs unzip library

---

## Next Steps

1. **Install Optional Libraries** (when needed):
   ```bash
   npm install pdf-parse docx unzipper
   ```

2. **Connect to Claude API** for vision capabilities:
   ```typescript
   const vision = await claude.vision.analyze(imageUrl);
   ```

3. **Implement Persistent Memory**:
   - Use Supabase or database for memory storage
   - Serialize/deserialize memory entries

4. **Add Memory UI**:
   - Show memory statistics
   - Allow manual memory management
   - Display related memories in chat

5. **Optimize Performance**:
   - Cache fetched links
   - Batch process files
   - Compress stored memories

---

## Support & Debugging

Check logs for detailed information:

```typescript
console.log("[File]", fileContent);
console.log("[Link]", linkContent);
console.log("[Memory Stats]", memoryStats);
console.log("[Attachment]", attachmentContext);
```

All utilities include detailed error messages to help with troubleshooting.
