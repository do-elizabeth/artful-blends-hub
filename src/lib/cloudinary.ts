import { supabase } from "@/lib/supabase";

export type CloudinarySettings = {
  cloudName: string;
  uploadPreset: string;
  folder: string;
};

const SETTINGS_KEY = "hearth-cloudinary-settings";

function environmentSettings(): CloudinarySettings {
  return {
    cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "").trim(),
    uploadPreset: (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "").trim(),
    folder: (import.meta.env.VITE_CLOUDINARY_FOLDER ?? "").trim().replace(/^\/+|\/+$/g, ""),
  };
}

export function readCloudinarySettings(): CloudinarySettings {
  const defaults = environmentSettings();
  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<CloudinarySettings> | null;
    return {
      cloudName: value?.cloudName?.trim() || defaults.cloudName,
      uploadPreset: value?.uploadPreset?.trim() || defaults.uploadPreset,
      folder: value?.folder?.trim().replace(/^\/+|\/+$/g, "") || defaults.folder,
    };
  } catch {
    return defaults;
  }
}

function normalizeCloudinarySettings(settings: Partial<CloudinarySettings>): CloudinarySettings {
  const defaults = environmentSettings();
  return {
    cloudName: settings.cloudName?.trim() || defaults.cloudName,
    uploadPreset: settings.uploadPreset?.trim() || defaults.uploadPreset,
    folder: settings.folder?.trim().replace(/^\/+|\/+$/g, "") || defaults.folder,
  };
}

export async function loadCloudinarySettings(): Promise<CloudinarySettings> {
  const local = readCloudinarySettings();
  if (!supabase) return local;

  const { data, error } = await supabase
    .from("cloudinary_settings")
    .select("cloud_name, upload_preset, folder")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return local;
  return normalizeCloudinarySettings({
    cloudName: data.cloud_name,
    uploadPreset: data.upload_preset,
    folder: data.folder,
  });
}

export async function saveCloudinarySettings(settings: CloudinarySettings): Promise<void> {
  const normalized = normalizeCloudinarySettings(settings);
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));

  if (!supabase) return;
  const { error } = await supabase.from("cloudinary_settings").upsert({
    id: 1,
    cloud_name: normalized.cloudName,
    upload_preset: normalized.uploadPreset,
    folder: normalized.folder,
  });
  if (error) throw error;
}

export async function uploadFileToCloudinary(
  settings: CloudinarySettings,
  file: File,
  publicId: string,
): Promise<{ secure_url?: string; public_id?: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", settings.uploadPreset);
  if (settings.folder) form.append("folder", settings.folder);
  if (publicId) form.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(settings.cloudName)}/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message ?? JSON.stringify(payload);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`Cloudinary ${response.status}: ${detail.slice(0, 300)}`);
  }

  return (await response.json()) as { secure_url?: string; public_id?: string };
}
