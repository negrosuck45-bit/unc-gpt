import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const IMAGE_VIDEO_WORKER_URL = "https://fragrant-band-d94a.blackmonkey098gg.workers.dev";

// Cloudflare Workers AI image models (ordered by preference)
const IMAGE_MODELS = [
  "@cf/black-forest-labs/flux-2-dev",
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/leonardo-ai/lucid-origin",
  "@cf/leonardo-ai/phoenix-1.0",
];

async function callWorker(
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: boolean; blob?: Blob; status: number; errorText?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(IMAGE_VIDEO_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return { ok: false, status: res.status, errorText };
    }

    const blob = await res.blob();
    if (blob.size < 1000) {
      return {
        ok: false,
        status: 500,
        errorText: `Response too small (${blob.size} bytes)`,
      };
    }
    return { ok: true, blob, status: 200 };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, status: 500, errorText: msg };
  }
}

// Generate video using multiple providers with fallbacks
async function generateVideo(prompt: string): Promise<{ url: string; model: string }> {
  const videoProviders = [
    {
      name: "Pollinations FastSVD",
      url: () => `https://video.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=fast-svd&nologo=true`,
      timeout: 180000,
    },
    {
      name: "Pollinations SVD-XT",
      url: () => `https://video.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=svd-xt&nologo=true`,
      timeout: 180000,
    },
    {
      name: "HuggingFace Zero-Shot Video",
      url: () => `https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b`,
      timeout: 180000,
      method: "POST",
      body: { inputs: prompt },
    },
  ];

  let lastError = "";

  for (const provider of videoProviders) {
    try {
      console.log(`[Imagine API] Trying ${provider.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), provider.timeout);
      
      const fetchOpts: RequestInit = {
        signal: controller.signal,
        method: provider.method || "GET",
      };

      if (provider.body) {
        fetchOpts.headers = { "Content-Type": "application/json" };
        fetchOpts.body = JSON.stringify(provider.body);
      }

      const res = await fetch(provider.url(), fetchOpts);
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const blob = await res.blob();
        
        // Check if response is valid video (not error HTML)
        if (blob.size > 5000 && (blob.type.includes("video") || blob.type.includes("octet"))) {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          console.log(`[Imagine API] ${provider.name} success: ${(blob.size / 1024).toFixed(0)}KB`);
          return {
            url: `data:video/mp4;base64,${base64}`,
            model: provider.name.toLowerCase().replace(/\s+/g, "-"),
          };
        }
      }

      lastError = `${provider.name}: ${res.status}`;
      console.log(`[Imagine API] ${provider.name} failed: ${res.status}`);
    } catch (err: any) {
      lastError = `${provider.name}: ${err.message}`;
      console.log(`[Imagine API] ${provider.name} error: ${err.message}`);
    }
  }
  
  throw new Error(`Video generation failed after trying all providers. Last error: ${lastError}. Please try generating an image instead.`);
}

// Generate image using Cloudflare Workers AI
async function generateImage(prompt: string, image?: string, aspectRatio?: string): Promise<{ url: string; model: string; size: number; mimeType: string }> {
  let successBlob: Blob | null = null;
  let usedModel = "";
  let lastError = "";

  for (const m of IMAGE_MODELS) {
    const payload: Record<string, unknown> = {
      task: "image",
      type: "image",
      prompt,
      model: m,
      image: image || null,
    };
    if (aspectRatio) payload.aspectRatio = aspectRatio;

    const result = await callWorker(payload, 45000);

    if (result.ok && result.blob) {
      successBlob = result.blob;
      usedModel = m;
      console.log(`[Imagine API] Image success with ${m}: ${(result.blob.size / 1024).toFixed(0)}KB`);
      break;
    }

    lastError = result.errorText || `status ${result.status}`;
  }

  if (!successBlob) {
    throw new Error(`All image models failed. Last error: ${lastError}`);
  }

  const arrayBuffer = await successBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = successBlob.type || "image/png";
  
  return {
    url: `data:${mimeType};base64,${base64}`,
    model: usedModel,
    size: successBlob.size,
    mimeType,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, prompt, image, aspectRatio } = body;

    if (!task || !prompt) {
      return Response.json(
        { error: "Missing required fields: task, prompt" },
        { status: 400 },
      );
    }

    console.log(
      `[Imagine API] task=${task} prompt="${String(prompt).slice(0, 60)}..." hasImage=${!!image}`,
    );
    console.log(`[UNCGPT] Generating ${task} | Prompt: "${String(prompt).slice(0, 50)}..."`);

    if (task === "video") {
      const result = await generateVideo(prompt);
      console.log(`[UNCGPT] Video generated | Model: ${result.model}`);
      return Response.json({
        url: result.url,
        model: result.model,
        mimeType: "video/mp4",
      });
    } else {
      const result = await generateImage(prompt, image, aspectRatio);
      console.log(`[UNCGPT] Image generated | Model: ${result.model}`);
      return Response.json(result);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error(`[Imagine API] Error: ${msg}`);
    return Response.json({ error: msg }, { status: 503 });
  }
}
