export async function imageSrcToDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("Could not read the source image.");
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not encode the image."));
    };
    reader.onerror = () => reject(new Error("Could not encode the image."));
    reader.readAsDataURL(blob);
  });
}

export async function compressImage(dataUrl: string, maxSize = 1024): Promise<string> {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the source image."));
    image.src = src;
  });
}

export function buildGenerationPrompt(note: string, styles: string[]): string {
  const styleLine = styles.length ? styles.join(", ") : "refined editorial photography";
  const direction = note.trim() || "elevate the light, color, and atmosphere";
  return [
    "Transform this photograph into a beautiful, museum-quality image.",
    "Keep the subject and composition recognizable.",
    `Creative direction: ${direction}.`,
    `Visual language: ${styleLine}.`,
    "Use natural lighting, rich but believable color, fine texture, and careful detail.",
    "No text, watermarks, logos, frames, or collage borders.",
  ].join(" ");
}
