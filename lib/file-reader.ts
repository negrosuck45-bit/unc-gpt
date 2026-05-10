/**
 * File Reader Utility
 * 
 * Handles reading various file types:
 * - Text files (txt, md, json, csv, etc.)
 * - Documents (pdf, docx)
 * - Code files (js, ts, py, etc.)
 * - Images (with OCR fallback)
 * - Archives (zip, tar)
 */

export interface FileContent {
  type: "text" | "image" | "code" | "document" | "archive" | "unknown";
  content: string;
  filename: string;
  mimeType: string;
  size: number;
  encoding?: string;
  metadata?: Record<string, any>;
}

export interface ReadFileOptions {
  maxSize?: number; // bytes, default 50MB
  encoding?: string;
  parseStructure?: boolean; // for documents
}

/**
 * Read text content from various file types
 */
export async function readFileContent(
  file: File | Blob,
  filename: string,
  options: ReadFileOptions = {}
): Promise<FileContent> {
  const { maxSize = 50 * 1024 * 1024, encoding = "utf-8", parseStructure = true } = options;
  const mimeType = (file as File).type || "application/octet-stream";
  const size = file.size;

  if (size > maxSize) {
    throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(2)}MB (max ${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Text files
  if (isTextFile(mimeType, filename)) {
    const text = await file.text();
    return {
      type: "text",
      content: text,
      filename,
      mimeType,
      size,
      encoding,
    };
  }

  // Code files
  if (isCodeFile(mimeType, filename)) {
    const text = await file.text();
    return {
      type: "code",
      content: text,
      filename,
      mimeType,
      size,
      encoding,
      metadata: {
        language: getLanguageFromFilename(filename),
      },
    };
  }

  // CSV/JSON with structure
  if ((mimeType.includes("json") || mimeType.includes("csv") || filename.endsWith(".json") || filename.endsWith(".csv")) && parseStructure) {
    const text = await file.text();
    return {
      type: "text",
      content: text,
      filename,
      mimeType,
      size,
      encoding,
      metadata: {
        format: filename.endsWith(".json") ? "json" : "csv",
      },
    };
  }

  // PDF (would need pdf-parse library, return info about it)
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    return {
      type: "document",
      content: `[PDF Document: ${filename}] - PDF parsing requires additional library. Content preview unavailable.`,
      filename,
      mimeType,
      size,
      metadata: {
        format: "pdf",
        note: "Install 'pdf-parse' to extract PDF text",
      },
    };
  }

  // DOCX (would need docx library)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    return {
      type: "document",
      content: `[DOCX Document: ${filename}] - Document parsing requires additional library.`,
      filename,
      mimeType,
      size,
      metadata: {
        format: "docx",
        note: "Install 'docx' to extract content",
      },
    };
  }

  // Images (could use OCR, for now just note the type)
  if (mimeType.startsWith("image/")) {
    const base64 = await fileToBase64(file);
    return {
      type: "image",
      content: `[Image: ${filename}] Size: ${(size / 1024).toFixed(2)}KB`,
      filename,
      mimeType,
      size,
      metadata: {
        base64: base64.substring(0, 100) + "...", // Store preview
        note: "Use Claude vision API for OCR",
      },
    };
  }

  // Archives
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/x-rar-compressed" ||
    filename.endsWith(".zip") ||
    filename.endsWith(".tar") ||
    filename.endsWith(".rar")
  ) {
    return {
      type: "archive",
      content: `[Archive: ${filename}] - Archive extraction requires additional library.`,
      filename,
      mimeType,
      size,
      metadata: {
        note: "Install 'unzipper' or 'tar' library to extract contents",
      },
    };
  }

  // Unknown/Binary
  return {
    type: "unknown",
    content: `[Binary File: ${filename}] Size: ${(size / 1024).toFixed(2)}KB`,
    filename,
    mimeType,
    size,
  };
}

/**
 * Batch read multiple files
 */
export async function readFilesContent(
  files: File[],
  options: ReadFileOptions = {}
): Promise<FileContent[]> {
  return Promise.all(files.map((f) => readFileContent(f, f.name, options)));
}

/**
 * Convert file to base64
 */
function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if file is text-based
 */
function isTextFile(mimeType: string, filename: string): boolean {
  const textMimes = [
    "text/plain",
    "text/html",
    "text/css",
    "text/markdown",
    "text/yaml",
    "text/xml",
    "application/json",
    "application/xml",
  ];

  const textExtensions = [".txt", ".md", ".log", ".yml", ".yaml", ".html", ".xml", ".csv"];

  return (
    textMimes.some((m) => mimeType.includes(m)) ||
    textExtensions.some((ext) => filename.toLowerCase().endsWith(ext)) ||
    mimeType.startsWith("text/")
  );
}

/**
 * Check if file is code
 */
function isCodeFile(mimeType: string, filename: string): boolean {
  const codeExtensions = [
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".cs",
    ".rb",
    ".go",
    ".rs",
    ".sh",
    ".bash",
    ".sql",
    ".r",
    ".php",
    ".swift",
    ".kt",
    ".scala",
  ];

  return (
    mimeType.includes("javascript") ||
    mimeType.includes("python") ||
    mimeType.includes("x-code") ||
    codeExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  );
}

/**
 * Get programming language from filename
 */
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    go: "go",
    rs: "rust",
    sh: "bash",
    sql: "sql",
    r: "r",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
  };
  return languageMap[ext] || ext;
}

/**
 * Get a summary of file content for chat context
 */
export function summarizeFileContent(fileContent: FileContent, maxChars: number = 2000): string {
  let summary = `📄 **${fileContent.filename}** (${fileContent.type})`;

  if (fileContent.mimeType) {
    summary += `\n*MIME: ${fileContent.mimeType}*`;
  }

  if (fileContent.metadata?.language) {
    summary += `\n*Language: ${fileContent.metadata.language}*`;
  }

  const contentPreview = fileContent.content.substring(0, maxChars);
  const truncated = fileContent.content.length > maxChars;

  summary += `\n\`\`\`${fileContent.metadata?.language || ""}\n${contentPreview}${truncated ? "\n... (truncated)" : ""}\n\`\`\``;

  return summary;
}
