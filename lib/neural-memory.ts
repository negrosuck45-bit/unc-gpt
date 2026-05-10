/**
 * Neural Memory System (Enhanced)
 * 
 * A brain-inspired memory layer with:
 * - Importance decay over time (memories fade if not accessed)
 * - Reinforcement on access (memories strengthen when retrieved)
 * - Weighted retrieval scoring (relevance + importance + recency)
 * - Automatic pruning of low-importance memories
 * - Merging of similar memories
 * - Context awareness and relationships
 * - Batch operations for efficiency
 * - Statistics and metrics tracking
 * 
 * This is entirely backend/logic-based. Users never see the neural scoring.
 */

export interface NeuralMemoryEntry {
  id: string;
  content: string;
  importance: number; // 0.0 to 1.0
  timestamp: Date;
  lastAccessedAt: Date;
  accessCount: number;
  tags?: string[];
  embedding?: number[]; // Placeholder for semantic vector
  type: "fact" | "conversation" | "instruction" | "note" | "summary" | "context" | "relationship";
  relatedIds?: string[]; // References to related memories
  context?: string; // Additional context/metadata
  source?: "user" | "ai" | "import" | "auto-summary" | "abstraction";
}

export interface NeuralRetrievalWeights {
  relevance: number; // default 0.5
  importance: number; // default 0.3
  recency: number; // default 0.2
}

export interface NeuralConfig {
  decayRate: number; // importance lost per day (default 0.05)
  decayThreshold: number; // memories below this are pruned (default 0.05)
  mergeSimilarityThreshold: number; // merge if similarity > this (default 0.92)
  autoMaintenanceInterval: number; // run maintenance every N stores (default 50)
  recencyHalfLifeDays: number; // how fast recency decays (default 7)
  weights: NeuralRetrievalWeights;
  maxMemories?: number; // soft limit before aggressive pruning (default 10000)
  relationshipDepth?: number; // how many levels of relationships to follow (default 2)
}

export interface NeuralMemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  avgImportance: number;
  avgAccessCount: number;
  oldestMemory?: Date;
  newestMemory?: Date;
  totalDecayed: number;
  totalPruned: number;
  totalMerged: number;
  totalAbstracted: number;
}

export const DEFAULT_NEURAL_CONFIG: NeuralConfig = {
  decayRate: 0.05,
  decayThreshold: 0.05,
  mergeSimilarityThreshold: 0.92,
  autoMaintenanceInterval: 50,
  recencyHalfLifeDays: 7,
  weights: {
    relevance: 0.5,
    importance: 0.3,
    recency: 0.2,
  },
  maxMemories: 10000,
  relationshipDepth: 2,
};

/**
 * Calculate semantic similarity between two texts (simple heuristic)
 * In production, use embeddings. Here we use word overlap as a fallback.
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) =>
    text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate importance decay based on time since last access
 */
export function calculateDecay(
  importance: number,
  lastAccessedAt: Date,
  decayRate: number,
): number {
  const daysSinceAccess =
    (Date.now() - lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(1 - decayRate, daysSinceAccess);
  return Math.max(0, importance * decayFactor);
}

/**
 * Calculate recency score (0 to 1, where 1 is very recent)
 */
export function calculateRecencyScore(
  timestamp: Date,
  halfLifeDays: number,
): number {
  const ageInDays =
    (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageInDays / halfLifeDays);
}

/**
 * Calculate the final neural score for a memory during retrieval
 */
export function calculateNeuralScore(
  entry: NeuralMemoryEntry,
  queryRelevance: number, // 0 to 1, from semantic search
  config: NeuralConfig,
): number {
  const currentImportance = calculateDecay(
    entry.importance,
    entry.lastAccessedAt,
    config.decayRate,
  );
  const recencyScore = calculateRecencyScore(
    entry.timestamp,
    config.recencyHalfLifeDays,
  );

  const finalScore =
    queryRelevance * config.weights.relevance +
    currentImportance * config.weights.importance +
    recencyScore * config.weights.recency;

  return finalScore;
}

/**
 * Reinforce a memory when accessed (increase importance and update access time)
 */
export function reinforceMemory(
  entry: NeuralMemoryEntry,
  reinforcementStrength: number = 0.1,
): NeuralMemoryEntry {
  return {
    ...entry,
    importance: Math.min(1.0, entry.importance + reinforcementStrength),
    lastAccessedAt: new Date(),
    accessCount: entry.accessCount + 1,
  };
}

/**
 * Apply decay to all memories (called during maintenance)
 */
export function applyDecayToAll(
  entries: NeuralMemoryEntry[],
  config: NeuralConfig,
): { result: NeuralMemoryEntry[]; decayedCount: number } {
  let decayedCount = 0;
  const result = entries.map((entry) => {
    const newImportance = calculateDecay(
      entry.importance,
      entry.lastAccessedAt,
      config.decayRate,
    );
    if (newImportance !== entry.importance) decayedCount++;
    
    return {
      ...entry,
      importance: newImportance,
    };
  });
  return { result, decayedCount };
}

/**
 * Prune memories below the decay threshold
 */
export function pruneMemories(
  entries: NeuralMemoryEntry[],
  config: NeuralConfig,
): { remaining: NeuralMemoryEntry[]; pruned: number } {
  const remaining = entries.filter(
    (e) => e.importance > config.decayThreshold,
  );
  return {
    remaining,
    pruned: entries.length - remaining.length,
  };
}

/**
 * Merge highly similar memories into one
 */
export function mergeMemories(
  entries: NeuralMemoryEntry[],
  config: NeuralConfig,
): { merged: NeuralMemoryEntry[]; mergedCount: number } {
  const merged: NeuralMemoryEntry[] = [];
  const processed = new Set<string>();

  for (const entry of entries) {
    if (processed.has(entry.id)) continue;

    let currentEntry = entry;
    let mergeCount = 0;

    for (const other of entries) {
      if (processed.has(other.id) || other.id === entry.id) continue;

      const similarity = calculateSimilarity(
        entry.content,
        other.content,
      );

      if (similarity > config.mergeSimilarityThreshold) {
        // Merge: combine content, take max importance, update timestamp
        const mergedTags = [
          ...(new Set([...(currentEntry.tags || []), ...(other.tags || [])])),
        ];
        const mergedRelations = [
          ...(new Set([
            ...(currentEntry.relatedIds || []),
            ...(other.relatedIds || []),
            other.id,
          ])),
        ].filter((id) => id !== currentEntry.id);

        currentEntry = {
          ...currentEntry,
          content: `${currentEntry.content}\n\n[MERGED] ${other.content}`,
          importance: Math.max(currentEntry.importance, other.importance),
          timestamp: new Date(
            Math.max(
              currentEntry.timestamp.getTime(),
              other.timestamp.getTime(),
            ),
          ),
          accessCount: currentEntry.accessCount + other.accessCount,
          tags: mergedTags,
          relatedIds: mergedRelations,
          source: "auto-summary",
        };
        processed.add(other.id);
        mergeCount++;
      }
    }

    merged.push(currentEntry);
    processed.add(entry.id);
  }

  return {
    merged,
    mergedCount: entries.length - merged.length,
  };
}

/**
 * Abstract clusters of related memories into a summary
 */
export function abstractMemories(
  entries: NeuralMemoryEntry[],
  clusterSize: number = 5,
): { abstracted: NeuralMemoryEntry[]; abstractedCount: number } {
  if (entries.length < clusterSize) {
    return { abstracted: entries, abstractedCount: 0 };
  }

  const abstracted: NeuralMemoryEntry[] = [];
  let abstractedCount = 0;

  // Group by type
  const byType: Record<string, NeuralMemoryEntry[]> = {};
  for (const entry of entries) {
    if (!byType[entry.type]) byType[entry.type] = [];
    byType[entry.type].push(entry);
  }

  // For each type, if we have >= clusterSize, create a summary
  for (const [type, typeEntries] of Object.entries(byType)) {
    if (typeEntries.length >= clusterSize) {
      const topEntries = typeEntries
        .sort((a, b) => b.importance - a.importance)
        .slice(0, clusterSize);

      const summaryContent = topEntries
        .map((e) => e.content.substring(0, 100))
        .join("; ");

      const summaryMemory: NeuralMemoryEntry = {
        id: `abstract-${type}-${Date.now()}`,
        content: `[ABSTRACT ${type.toUpperCase()}] ${summaryContent}...`,
        importance: Math.max(...topEntries.map((e) => e.importance)) * 0.9,
        timestamp: new Date(),
        lastAccessedAt: new Date(),
        accessCount: topEntries.reduce((sum, e) => sum + e.accessCount, 0),
        type: "summary",
        tags: [...new Set(topEntries.flatMap((e) => e.tags || []))],
        relatedIds: topEntries.map((e) => e.id),
        source: "abstraction",
      };

      abstracted.push(summaryMemory);
      abstractedCount += clusterSize;

      // Add remaining entries
      abstracted.push(...typeEntries.slice(clusterSize));
    } else {
      abstracted.push(...typeEntries);
    }
  }

  return { abstracted, abstractedCount };
}

/**
 * Run full maintenance cycle: decay, prune, merge, abstract
 */
export function runNeuralMaintenance(
  entries: NeuralMemoryEntry[],
  config: NeuralConfig,
): {
  result: NeuralMemoryEntry[];
  stats: {
    decayed: number;
    pruned: number;
    merged: number;
    abstracted: number;
  };
} {
  // Step 1: Apply decay
  let { result, decayedCount } = applyDecayToAll(entries, config);

  // Step 2: Prune
  const { remaining: prunedResult, pruned } = pruneMemories(result, config);
  result = prunedResult;

  // Step 3: Merge similar
  const { merged: mergedResult, mergedCount } = mergeMemories(result, config);
  result = mergedResult;

  // Step 4: Abstract clusters
  const { abstracted: abstractedResult, abstractedCount } = abstractMemories(
    result,
    5,
  );
  result = abstractedResult;

  return {
    result,
    stats: {
      decayed: decayedCount,
      pruned,
      merged: mergedCount,
      abstracted: abstractedCount,
    },
  };
}

/**
 * Retrieve memories using neural scoring
 */
export function retrieveWithNeuralScoring(
  entries: NeuralMemoryEntry[],
  queryRelevanceScores: Record<string, number>, // id -> relevance score
  config: NeuralConfig,
  topK: number = 5,
): NeuralMemoryEntry[] {
  const scored = entries.map((entry) => {
    const queryRelevance = queryRelevanceScores[entry.id] || 0;
    const score = calculateNeuralScore(entry, queryRelevance, config);
    return { entry, score };
  });

  // Sort by score descending and take top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

/**
 * Retrieve with relationship expansion
 */
export function retrieveWithRelationships(
  entries: NeuralMemoryEntry[],
  queryRelevanceScores: Record<string, number>,
  config: NeuralConfig,
  topK: number = 5,
  depth: number = 1,
): NeuralMemoryEntry[] {
  const primary = retrieveWithNeuralScoring(
    entries,
    queryRelevanceScores,
    config,
    topK,
  );

  if (depth <= 0 || depth > (config.relationshipDepth || 2)) {
    return primary;
  }

  const relatedIds = new Set<string>();
  const idToEntry = new Map(entries.map((e) => [e.id, e]));

  // Expand through relationships
  for (const entry of primary) {
    if (entry.relatedIds) {
      for (const relId of entry.relatedIds) {
        relatedIds.add(relId);
      }
    }
  }

  // Get related entries
  const related = Array.from(relatedIds)
    .map((id) => idToEntry.get(id))
    .filter((e) => e && !primary.find((p) => p.id === e.id));

  return [...primary, ...(related as NeuralMemoryEntry[])].slice(0, topK * 2);
}

/**
 * Calculate statistics about memories
 */
export function calculateMemoryStats(
  entries: NeuralMemoryEntry[],
  maintenanceStats?: { decayed: number; pruned: number; merged: number; abstracted: number },
): NeuralMemoryStats {
  const byType: Record<string, number> = {};
  let totalImportance = 0;
  let totalAccess = 0;
  let oldestTime = Infinity;
  let newestTime = 0;

  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    totalImportance += entry.importance;
    totalAccess += entry.accessCount;
    oldestTime = Math.min(oldestTime, entry.timestamp.getTime());
    newestTime = Math.max(newestTime, entry.timestamp.getTime());
  }

  return {
    totalMemories: entries.length,
    byType,
    avgImportance: entries.length > 0 ? totalImportance / entries.length : 0,
    avgAccessCount: entries.length > 0 ? totalAccess / entries.length : 0,
    oldestMemory: oldestTime !== Infinity ? new Date(oldestTime) : undefined,
    newestMemory: newestTime > 0 ? new Date(newestTime) : undefined,
    totalDecayed: maintenanceStats?.decayed ?? 0,
    totalPruned: maintenanceStats?.pruned ?? 0,
    totalMerged: maintenanceStats?.merged ?? 0,
    totalAbstracted: maintenanceStats?.abstracted ?? 0,
  };
}

/**
 * Find memories by tag
 */
export function findByTag(
  entries: NeuralMemoryEntry[],
  tag: string,
): NeuralMemoryEntry[] {
  const lowerTag = tag.toLowerCase();
  return entries.filter(
    (e) => e.tags?.some((t) => t.toLowerCase().includes(lowerTag)),
  );
}

/**
 * Find memories by type
 */
export function findByType(
  entries: NeuralMemoryEntry[],
  type: NeuralMemoryEntry["type"],
): NeuralMemoryEntry[] {
  return entries.filter((e) => e.type === type);
}

/**
 * Search memories by content
 */
export function searchMemories(
  entries: NeuralMemoryEntry[],
  query: string,
  config: NeuralConfig,
  topK: number = 10,
): NeuralMemoryEntry[] {
  const queryLower = query.toLowerCase();
  
  const scored = entries.map((entry) => {
    const contentMatch = entry.content.toLowerCase().includes(queryLower)
      ? 1.0
      : calculateSimilarity(query, entry.content);
    
    const tagMatch = entry.tags?.some((t) =>
      t.toLowerCase().includes(queryLower),
    )
      ? 0.9
      : 0;

    const relevance = Math.max(contentMatch, tagMatch);
    const score = calculateNeuralScore(entry, relevance, config);
    
    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

