import { supabase } from "@/lib/supabase";
import { uploadFileToCloudinary, type CloudinarySettings } from "@/lib/cloudinary";

export type GenerationRecord = {
  id: string;
  user_id: string;
  label: string;
  prompt: string;
  image_path: string;
  image_url: string;
  download_count: number;
  created_at: string;
};

export async function chooseDownloadDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === "undefined" || typeof window.showDirectoryPicker !== "function") {
    return null;
  }

  try {
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return null;
    }
    throw err;
  }
}

async function saveBlobToDirectory(directoryHandle: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function downloadImageUrlToDirectory(
  src: string,
  fileName: string,
  directoryHandle: FileSystemDirectoryHandle | null,
) {
  if (!directoryHandle) {
    const link = document.createElement("a");
    link.href = src;
    link.download = fileName;
    link.rel = "noopener";
    link.target = "_self";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not download the generated image.");

  const blob = await response.blob();
  await saveBlobToDirectory(directoryHandle, fileName, blob);
}

export type FolderCopyResult = {
  copied: number;
  failed: number;
  lines: string[];
};

export type CloudinaryUploadResult = {
  uploaded: number;
  failed: number;
  errors: string[];
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(2)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

async function* walkDirectory(source: FileSystemDirectoryHandle, prefix = "") {
  let entries: Array<FileSystemFileHandle | FileSystemDirectoryHandle & { kind?: "file" | "directory" }> = [];
  try {
    entries = [];
    for await (const entry of source.values()) entries.push(entry as never);
  } catch (err) {
    yield { error: err, path: prefix || ".", kind: "dir" };
    return;
  }

  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.kind === "file") {
      try {
        const file = await entry.getFile();
        yield { path, name: entry.name, size: file.size };
      } catch (err) {
        yield { error: err, path, kind: "file" };
      }
    } else if (entry.kind === "directory") {
      yield* walkDirectory(entry as FileSystemDirectoryHandle, path);
    }
  }
}

async function resolveFileHandle(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split("/");
  const name = parts.pop() ?? "";
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }
  return current.getFileHandle(name);
}

async function ensureDirectory(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
  if (!path) return root;
  let current = root;
  for (const part of path.split("/")) {
    if (!part) continue;
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

function dirname(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export async function copyFolderToDirectory(
  sourceFolder: FileSystemDirectoryHandle,
  targetFolder: FileSystemDirectoryHandle,
): Promise<FolderCopyResult> {
  try {
    if (await sourceFolder.isSameEntry(targetFolder)) {
      throw new Error("Source and project folders are the same. Copying would truncate files before reading them.");
    }
  } catch {
    // isSameEntry can throw on older or revoked handles, ignore and continue.
  }

  const files: Array<{ path: string; name: string; size: number }> = [];
  const errors: Array<{ error: unknown; path: string; kind: string }> = [];

  for await (const item of walkDirectory(sourceFolder)) {
    if ("error" in (item as { error?:unknown })) {
      errors.push(item as { error: unknown; path: string; kind: string });
    } else {
      files.push(item as { path: string; name: string; size: number });
    }
  }

  files.sort((a, b) => a.size - b.size || a.path.localeCompare(b.path));

  const lines: string[] = [];
  const failedDirs = new Set<string>();
  let copied = 0;
  let failed = 0;
  let copiedBytes = 0;

  for (const item of files) {
    try {
      const srcHandle = await resolveFileHandle(sourceFolder, item.path);
      const srcFile = await srcHandle.getFile();
      const buffer = await srcFile.arrayBuffer();

      const dstDir = await ensureDirectory(targetFolder, dirname(item.path));
      const dstHandle = await dstDir.getFileHandle(item.name, { create: true });
      const writable = await dstHandle.createWritable();
      await writable.write(buffer);
      await writable.close();

      copied += 1;
      copiedBytes += buffer.byteLength;
      lines.push(`✔ ${formatBytes(item.size).padStart(10, " ")}  ${item.path}`);
    } catch (err) {
      failed += 1;
      failedDirs.add(dirname(item.path) || ".");
      lines.push(`✘ ${item.path} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failed > 0) {
    lines.push(`Affected folders: ${Array.from(failedDirs).join(", ")}`);
  }

  lines.push(`Done. Copied ${copied} file(s) (${formatBytes(copiedBytes)}). Failed: ${failed}.`);

  return { copied, failed, lines };
}

export async function uploadFolderToCloudinary(
  sourceFolder: FileSystemDirectoryHandle,
  settings: CloudinarySettings,
): Promise<CloudinaryUploadResult> {
  const files: Array<{ path: string; name: string; size: number }> = [];
  const errors: string[] = [];

  for await (const item of walkDirectory(sourceFolder)) {
    if ("error" in (item as { error?: unknown })) {
      const errorItem = item as { error: unknown; path: string };
      errors.push(`${errorItem.path} — ${errorItem.error instanceof Error ? errorItem.error.message : String(errorItem.error)}`);
    } else {
      files.push(item as { path: string; name: string; size: number });
    }
  }

  files.sort((a, b) => a.size - b.size || a.path.localeCompare(b.path));

  let uploaded = 0;
  let failed = 0;
  for (const item of files) {
    try {
      const fileHandle = await resolveFileHandle(sourceFolder, item.path);
      const file = await fileHandle.getFile();
      const publicId = item.path.replace(/\.[^./]+$/, "");
      await uploadFileToCloudinary(settings, file, publicId);
      uploaded += 1;
    } catch (error) {
      failed += 1;
      errors.push(`${item.path} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { uploaded, failed, errors };
}

export async function copyFolderToProjectPublicFolder(
  sourceFolder: FileSystemDirectoryHandle,
  username: string,
): Promise<FolderCopyResult> {
  const safeUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  if (!safeUsername) {
    throw new Error("A valid username is required before copying the folder.");
  }

  if (typeof window === "undefined" || typeof window.showDirectoryPicker !== "function") {
    throw new Error("The browser cannot open the project directory picker.");
  }

  const projectRoot = await window.showDirectoryPicker({ mode: "readwrite" });
  const destination = await ensureDirectory(projectRoot, `public/folder/${safeUsername}`);
  return copyFolderToDirectory(sourceFolder, destination);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) {
    throw new Error("The generated image could not be saved.");
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: match[1] });
}

async function uploadImage(userId: string, src: string): Promise<{ path: string; url: string }> {
  if (!supabase) throw new Error("Supabase is not connected.");

  if (src.startsWith("http://") || src.startsWith("https://")) {
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const response = await fetch(src);
    if (!response.ok) throw new Error("Could not download the generated image.");
    const blob = await response.blob();
    const { error } = await supabase.storage.from("generations").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("generations").getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  const blob = dataUrlToBlob(src);
  const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("generations").upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("generations").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function saveGenerations(
  userId: string,
  items: { src: string; label: string; prompt: string }[],
): Promise<GenerationRecord[]> {
  if (!supabase) throw new Error("Supabase is not connected.");

  const records: GenerationRecord[] = [];
  for (const item of items) {
    const uploaded = await uploadImage(userId, item.src);
    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        label: item.label,
        prompt: item.prompt,
        image_path: uploaded.path,
        image_url: uploaded.url,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not save the generated image.");
    records.push(data);
  }
  return records;
}

export async function listGenerations(userId: string): Promise<GenerationRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function removeGeneration(item: GenerationRecord) {
  if (!supabase) return;
  if (item.image_path) {
    await supabase.storage.from("generations").remove([item.image_path]);
  }
  const { error } = await supabase.from("generations").delete().eq("id", item.id);
  if (error) throw error;
}

export async function downloadGeneration(item: GenerationRecord): Promise<number> {
  if (!supabase) throw new Error("Supabase is not connected.");

  const { data, error } = await supabase.rpc("increment_download", {
    generation_id: item.id,
  });
  if (error) throw error;

  return typeof data === "number" ? data : item.download_count + 1;
}

export async function recordGalleryDownload(): Promise<number> {
  if (!supabase) throw new Error("Supabase is not connected.");

  const { data, error } = await supabase.rpc("increment_profile_downloads");
  if (error) throw error;

  return typeof data === "number" ? data : 0;
}
