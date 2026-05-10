/**
 * Enhanced Memory System
 * 
 * Provides structured, realistic memory management with:
 * - Timestamped entries
 * - Automatic deduplication
 * - Smart summarization
 * - Memory metadata and organization
 */

export interface MemoryEntry {
  id: string;
  type: "fact" | "conversation" | "instruction" | "note" | "summary";
  content: string;
  timestamp: Date;
  tags?: string[];
  importance: "low" | "medium" | "high";
  source?: "user" | "ai" | "import" | "auto-summary";
}

export interface MemoryMetadata {
  totalEntries: number;
  lastUpdated: Date;
  characterCount: number;
  entriesByType: Record<string, number>;
}

/**
 * Parse raw memory text into structured entries
 */
export function parseMemoryText(text: string): MemoryEntry[] {
  if (!text.trim()) return [];

  const entries: MemoryEntry[] = [];
  const lines = text.split("\n").filter((l) => l.trim());

  let currentEntry: Partial<MemoryEntry> = {};
  let contentLines: string[] = [];

  for (const line of lines) {
    // Check for entry markers
    if (line.startsWith("### ") || line.startsWith("## ")) {
      // Save previous entry if exists
      if (contentLines.length > 0 && currentEntry.content === undefined) {
        currentEntry.content = contentLines.join("\n").trim();
        entries.push(currentEntry as MemoryEntry);
        currentEntry = {};
        contentLines = [];
      }

      // Parse header
      const header = line.replace(/^#+\s*/, "").trim();
      currentEntry = {
        id: crypto.randomUUID(),
        type: "note",
        timestamp: new Date(),
        importance: "medium",
        source: "import",
        content: header,
      };
    } else if (line.startsWith("---")) {
      // Separator - finalize current entry
      if (contentLines.length > 0 && currentEntry.content === undefined) {
        currentEntry.content = contentLines.join("\n").trim();
        entries.push(currentEntry as MemoryEntry);
        currentEntry = {};
        contentLines = [];
      }
    } else {
      contentLines.push(line);
    }
  }

  // Save last entry
  if (contentLines.length > 0 || Object.keys(currentEntry).length > 0) {
    if (currentEntry.content === undefined) {
      currentEntry.content = contentLines.join("\n").trim();
    }
    if (currentEntry.content) {
      entries.push(currentEntry as MemoryEntry);
    }
  }

  return entries;
}

/**
 * Convert structured entries back to formatted text
 */
export function formatMemoryEntries(entries: MemoryEntry[]): string {
  if (entries.length === 0) return "";

  return entries
    .map((entry) => {
      const header = `### ${entry.type.toUpperCase()} [${entry.importance}] (${entry.timestamp.toLocaleDateString()})`;
      const tags = entry.tags && entry.tags.length > 0 ? `\nTags: ${entry.tags.join(", ")}` : "";
      return `${header}${tags}\n\n${entry.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Add a new memory entry with deduplication
 */
export function addMemoryEntry(
  entries: MemoryEntry[],
  content: string,
  type: MemoryEntry["type"] = "note",
  importance: MemoryEntry["importance"] = "medium",
): MemoryEntry[] {
  // Check for duplicates (simple content similarity)
  const isDuplicate = entries.some(
    (e) => e.content.toLowerCase().includes(content.toLowerCase().slice(0, 50)) || 
           content.toLowerCase().includes(e.content.toLowerCase().slice(0, 50))
  );

  if (isDuplicate) {
    return entries;
  }

  const newEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    type,
    content: content.trim(),
    timestamp: new Date(),
    importance,
    source: "user",
  };

  return [...entries, newEntry];
}

/**
 * Get memory metadata
 */
export function getMemoryMetadata(entries: MemoryEntry[]): MemoryMetadata {
  const entriesByType: Record<string, number> = {};
  let totalChars = 0;

  entries.forEach((e) => {
    entriesByType[e.type] = (entriesByType[e.type] ?? 0) + 1;
    totalChars += e.content.length;
  });

  return {
    totalEntries: entries.length,
    lastUpdated: entries.length > 0 ? new Date(Math.max(...entries.map((e) => e.timestamp.getTime()))) : new Date(),
    characterCount: totalChars,
    entriesByType,
  };
}

/**
 * Filter entries by importance or type
 */
export function filterMemoryEntries(
  entries: MemoryEntry[],
  filters: {
    type?: MemoryEntry["type"];
    importance?: MemoryEntry["importance"];
    afterDate?: Date;
  },
): MemoryEntry[] {
  return entries.filter((e) => {
    if (filters.type && e.type !== filters.type) return false;
    if (filters.importance && e.importance !== filters.importance) return false;
    if (filters.afterDate && e.timestamp < filters.afterDate) return false;
    return true;
  });
}

/**
 * Summarize memory entries (for context window optimization)
 */
export function summarizeMemory(entries: MemoryEntry[], maxChars: number = 2000): string {
  if (entries.length === 0) return "";

  // Sort by importance and recency
  const sorted = [...entries].sort((a, b) => {
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    const importanceDiff = importanceOrder[b.importance] - importanceOrder[a.importance];
    if (importanceDiff !== 0) return importanceDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  let result = "";
  for (const entry of sorted) {
    const entryText = `[${entry.type.toUpperCase()}] ${entry.content}\n`;
    if ((result + entryText).length > maxChars) break;
    result += entryText;
  }

  return result.trim();
}

/**
 * Merge duplicate or similar entries
 */
export function deduplicateMemory(entries: MemoryEntry[]): MemoryEntry[] {
  const seen = new Set<string>();
  const result: MemoryEntry[] = [];

  for (const entry of entries) {
    const key = entry.content.toLowerCase().slice(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
}
