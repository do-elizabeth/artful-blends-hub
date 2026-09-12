/// <reference types="vite/client" />

interface FileSystemFileHandle {
  name: string;
  kind?: "file" | "directory";
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob | ArrayBuffer): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface FileSystemDirectoryHandle {
  name: string;
  kind?: "file" | "directory";
  values(): AsyncIterable<FileSystemHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string): Promise<void>;
  isSameEntry(other: FileSystemDirectoryHandle): Promise<boolean>;
  queryPermission?(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}

interface FileSystemHandle {
  name: string;
  kind: "file" | "directory";
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  readonly VITE_CLOUDINARY_FOLDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
