export type GalleryItem = {
  id: string;
  src: string;
  label: string;
  prompt: string;
  createdAt: number;
};

const KEY = "hearth.gallery";

export function readGallery(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GalleryItem[]) : [];
  } catch {
    return [];
  }
}

export function addToGallery(items: Omit<GalleryItem, "id" | "createdAt">[]) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const next: GalleryItem[] = [
    ...items.map((item, index) => ({
      ...item,
      id: `${now}-${index}`,
      createdAt: now,
    })),
    ...readGallery(),
  ].slice(0, 60);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeFromGallery(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify(readGallery().filter((item) => item.id !== id)),
  );
}
