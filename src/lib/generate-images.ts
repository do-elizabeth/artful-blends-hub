import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  imageDataUrl: z.string().min(1),
  variations: z.array(z.string().min(1)).min(1).max(3),
});

export type GeneratedImage = {
  id: string;
  label: string;
  src: string;
  alt: string;
};

function puterKey(): string | undefined {
  return process.env["PUTER_API_KEY"] ?? process.env["PUTER_AUTH_TOKEN"];
}

function mimeFromDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);/i.exec(dataUrl);
  return match?.[1] ?? "image/jpeg";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractImageSrc(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("http")) return trimmed;
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 80) {
      return `data:image/png;base64,${trimmed}`;
    }
  }

  const record = asRecord(value);
  if (!record) return null;

  const nested = record["result"] ?? record["image"] ?? record["output"];
  if (nested && nested !== value) {
    const fromNested = extractImageSrc(nested);
    if (fromNested) return fromNested;
  }

  const src = record["src"];
  const url = record["url"];
  const b64 = record["b64_json"];
  if (typeof src === "string" && src) return src;
  if (typeof url === "string" && url) return url;
  if (typeof b64 === "string" && b64) return `data:image/png;base64,${b64}`;
  return null;
}

function driverError(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const error = asRecord(record?.["error"]);
  const message =
    (typeof record?.["message"] === "string" && record["message"]) ||
    (typeof error?.["message"] === "string" && error["message"]) ||
    fallback;
  return new Error(message);
}

async function generateOne(prompt: string, imageDataUrl: string): Promise<string> {
  const apiKey = puterKey();
  if (!apiKey) {
    throw new Error("PUTER_API_KEY is missing. Add it to your .env file and restart the dev server.");
  }

  const response = await fetch("https://api.puter.com/drivers/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      interface: "puter-image-generation",
      service: "openai-image-generation",
      method: "generate",
      args: {
        prompt,
        model: "gpt-image-1.5",
        quality: "high",
        input_image: imageDataUrl,
        input_image_mime_type: mimeFromDataUrl(imageDataUrl),
      },
    }),
  });

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";

  if (contentType.includes("application/json")) {
    const payload: unknown = await response.json();
    if (!response.ok) throw driverError(payload, `Puter request failed (${response.status}).`);
    const record = asRecord(payload);
    if (record && record["success"] === false) {
      throw driverError(payload, "Puter could not generate the image.");
    }
    const src = extractImageSrc(payload);
    if (!src) throw new Error("Puter did not return an image.");
    return src;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(bytes.toString("utf8") || `Puter request failed (${response.status}).`);
  }

  const mime = contentType.startsWith("image/") ? contentType : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export const generateStudioImages = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<GeneratedImage[]> => {
    if (!puterKey()) {
      throw new Error("PUTER_API_KEY is missing. Add it to your .env file and restart the dev server.");
    }

    return Promise.all(
      data.variations.map(async (label, index) => {
        const prompt =
          index === 0
            ? data.prompt
            : `${data.prompt} Variation ${index + 1}: ${label}. Keep it cohesive and exquisite.`;
        const src = await generateOne(prompt, data.imageDataUrl);
        return {
          id: `gen-${Date.now()}-${index}`,
          label,
          src,
          alt: `${label} interpretation of the uploaded image`,
        };
      }),
    );
  });
