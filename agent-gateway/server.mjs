import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.AGENT_GATEWAY_SECRET || "";
const WORKSPACE = path.resolve(process.env.AGENT_WORKSPACE || "/workspace/uncgpt");
const SCREENSHOT_DIR = path.join(WORKSPACE, ".agent-screenshots");
const MAX_OUTPUT = 12_000;
let browserContext;
let page;

if (!SECRET) {
  console.error("AGENT_GATEWAY_SECRET is required");
  process.exit(1);
}

const toolDefinitions = [
  { name: "browser_open", description: "Open an HTTP(S) website in the isolated browser and return its title and visible text.", inputSchema: { type: "object", properties: { url: { type: "string", pattern: "^https?://" } }, required: ["url"] } },
  { name: "browser_screenshot", description: "Capture the current isolated browser page and return the saved screenshot path and page metadata.", inputSchema: { type: "object", properties: { fullPage: { type: "boolean" } } } },
  { name: "browser_click", description: "Click a visible button or link by accessible role/name or CSS selector.", inputSchema: { type: "object", properties: { selector: { type: "string" } }, required: ["selector"] } },
  { name: "browser_type", description: "Fill a visible form field using a CSS selector.", inputSchema: { type: "object", properties: { selector: { type: "string" }, text: { type: "string", maxLength: 4000 } }, required: ["selector", "text"] } },
  { name: "files_list", description: "List files inside the approved project workspace.", inputSchema: { type: "object", properties: { relativePath: { type: "string" } } } },
  { name: "files_read", description: "Read a text file inside the approved project workspace.", inputSchema: { type: "object", properties: { relativePath: { type: "string" }, maxChars: { type: "number", maximum: 30000 } }, required: ["relativePath"] } },
  { name: "files_write", description: "Write a text file inside the approved project workspace. This is an irreversible action and requires approval upstream.", inputSchema: { type: "object", properties: { relativePath: { type: "string" }, content: { type: "string", maxLength: 100000 } }, required: ["relativePath", "content"] } },
  { name: "terminal_exec", description: "Run a short allowlisted development command in the approved workspace. Destructive commands and network downloads are blocked.", inputSchema: { type: "object", properties: { command: { type: "string", maxLength: 500 }, timeoutMs: { type: "number", maximum: 30000 } }, required: ["command"] } },
  { name: "git_status", description: "Show the current Git status in the approved workspace.", inputSchema: { type: "object", properties: {} } },
  { name: "git_diff", description: "Show the current Git diff in the approved workspace.", inputSchema: { type: "object", properties: {} } },
];

function safePath(relativePath = ".") {
  const resolved = path.resolve(WORKSPACE, relativePath);
  if (resolved !== WORKSPACE && !resolved.startsWith(`${WORKSPACE}${path.sep}`)) throw new Error("Path is outside the approved workspace");
  return resolved;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(payload);
}

function authorized(req) {
  const supplied = req.headers["x-uncgpt-agent-secret"] || "";
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 200_000) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

async function getPage() {
  if (!browserContext) {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    browserContext = await chromium.launchPersistentContext(path.join(WORKSPACE, ".browser"), {
      headless: true,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: false,
    });
    page = await browserContext.newPage();
  }
  return page;
}

async function textSummary(currentPage) {
  return {
    url: currentPage.url(),
    title: await currentPage.title().catch(() => ""),
    text: (await currentPage.locator("body").innerText().catch(() => "")).slice(0, 12000),
  };
}

function blockedCommand(command) {
  return /(^|[;&|])\s*(rm|mkfs|shutdown|reboot|poweroff|kill|dd|sudo)\b|curl\s+.*\|\s*(sh|bash)|wget\s+.*\|\s*(sh|bash)|docker\s+run.*--privileged|ssh\s|scp\s|nc\s|netcat\s/i.test(command);
}

async function runTool(name, args = {}) {
  if (name === "browser_open") {
    const currentPage = await getPage();
    await currentPage.goto(args.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await textSummary(currentPage);
  }
  if (name === "browser_screenshot") {
    const currentPage = await getPage();
    const filename = `${Date.now()}.png`;
    const target = path.join(SCREENSHOT_DIR, filename);
    await currentPage.screenshot({ path: target, fullPage: Boolean(args.fullPage) });
    return { ...(await textSummary(currentPage)), screenshot: path.relative(WORKSPACE, target) };
  }
  if (name === "browser_click") {
    const currentPage = await getPage();
    await currentPage.locator(args.selector).first().click({ timeout: 15000 });
    return await textSummary(currentPage);
  }
  if (name === "browser_type") {
    const currentPage = await getPage();
    await currentPage.locator(args.selector).first().fill(String(args.text || ""), { timeout: 15000 });
    return await textSummary(currentPage);
  }
  if (name === "files_list") {
    const dir = safePath(args.relativePath || ".");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" }));
  }
  if (name === "files_read") {
    const target = safePath(args.relativePath);
    const stat = await fs.stat(target);
    if (stat.size > 2_000_000) throw new Error("File is too large to read through the agent tool");
    return (await fs.readFile(target, "utf8")).slice(0, Number(args.maxChars || 30000));
  }
  if (name === "files_write") {
    const target = safePath(args.relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, String(args.content || ""), "utf8");
    return { written: path.relative(WORKSPACE, target), bytes: Buffer.byteLength(String(args.content || "")) };
  }
  if (name === "terminal_exec") {
    const command = String(args.command || "").trim();
    if (!command || blockedCommand(command)) throw new Error("Command is empty or blocked by the safety policy");
    const timeout = Math.min(Math.max(Number(args.timeoutMs || 15000), 1000), 30000);
    const result = await execFileAsync("bash", ["-lc", command], { cwd: WORKSPACE, timeout, maxBuffer: 2_000_000, env: { ...process.env, HOME: "/home/agent" } });
    return { stdout: result.stdout.slice(0, MAX_OUTPUT), stderr: result.stderr.slice(0, MAX_OUTPUT), exitCode: 0 };
  }
  if (name === "git_status" || name === "git_diff") {
    const command = name === "git_status" ? ["status", "--short"] : ["diff", "--", "."];
    const result = await execFileAsync("git", command, { cwd: WORKSPACE, timeout: 15000, maxBuffer: 2_000_000 });
    return result.stdout.slice(0, MAX_OUTPUT);
  }
  throw new Error(`Unknown tool: ${name}`);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, workspace: WORKSPACE });
    if (!authorized(req)) return json(res, 401, { error: "Unauthorized" });
    if (req.method === "GET" && req.url === "/v1/tools") return json(res, 200, { tools: toolDefinitions });
    if (req.method === "POST" && req.url === "/v1/tools/call") {
      const input = await body(req);
      const result = await runTool(input.name, input.arguments || {});
      return json(res, 200, { ok: true, result });
    }
    if (req.method === "POST" && req.url === "/v1/run") {
      const input = await body(req);
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "status", status: "ready", task: input.task || "" })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "status", status: "Use the model tool loop to select browser, terminal, file, Git, or MCP actions." })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Internal gateway error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`uncgpt agent gateway listening on 127.0.0.1:${PORT}`);
  console.log(`workspace: ${WORKSPACE}`);
});
