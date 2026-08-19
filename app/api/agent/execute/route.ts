import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 45_000;

function gatewayConfig() {
  const url = process.env.AGENT_GATEWAY_URL?.replace(/\/$/, "");
  const secret = process.env.AGENT_GATEWAY_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

export async function GET() {
  const configured = !!gatewayConfig();
  return NextResponse.json({
    configured,
    enabled: process.env.AGENT_BROWSER_ENABLED === "true" || process.env.AGENT_TERMINAL_ENABLED === "true",
  });
}

export async function POST(request: NextRequest) {
  const config = gatewayConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Agent computer is not configured. Add AGENT_GATEWAY_URL and AGENT_GATEWAY_SECRET on the server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.task !== "string" || payload.task.trim().length === 0) {
    return NextResponse.json({ error: "A non-empty task is required" }, { status: 400 });
  }

  const timeoutMs = Math.min(
    Math.max(Number(process.env.AGENT_GATEWAY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS), 5_000),
    120_000
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(`${config.url}/v1/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
        "X-UncGPT-Agent-Secret": config.secret,
      },
      body: JSON.stringify({
        task: payload.task,
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        approvalToken: typeof payload.approvalToken === "string" ? payload.approvalToken : undefined,
        requestedTools: Array.isArray(payload.requestedTools) ? payload.requestedTools : [],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Agent gateway request failed", status: upstream.status, detail: detail.slice(0, 1000) },
        { status: 502 }
      );
    }

    const headers = new Headers({
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const contentType = upstream.headers.get("content-type") || "application/json";
    headers.set("Content-Type", contentType);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Agent gateway timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Could not reach agent gateway" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
