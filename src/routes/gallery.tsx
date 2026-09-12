import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/lib/auth-context";
import { loadCloudinarySettings } from "@/lib/cloudinary";
import { DEFAULT_GALLERY, downloadImageSrc, type DefaultGalleryItem } from "@/lib/gallery";
import {
  chooseDownloadDirectory,
  downloadGeneration,
  downloadImageUrlToDirectory,
  listGenerations,
  recordGalleryDownload,
  removeGeneration,
  uploadFolderToCloudinary,
  type GenerationRecord,
} from "@/lib/generations";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — every image you made in Hearth" },
      { name: "description", content: "Browse everything that came back from the Hearth studio, kept together in one calm gallery." },
      { property: "og:title", content: "Gallery — every image you made in Hearth" },
      { property: "og:description", content: "Browse everything that came back from the Hearth studio, kept together in one calm gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<GenerationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      setItems(await listGenerations(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the gallery.");
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onDownloadDefault(item: DefaultGalleryItem) {
    setError(null);
    setDownloadMessage(null);
    try {
      if (user) await recordGalleryDownload();
      const directoryHandle = await chooseDownloadDirectory();
      const fileName = `${item.label.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      const settings = await loadCloudinarySettings();
      console.log("❌❌❌ Cloudinary settings:", settings);
      if (!directoryHandle) return;
      if (!settings.cloudName || !settings.uploadPreset) {
        throw new Error("Cloudinary is not configured. Set the cloud name and unsigned upload preset in the admin panel or environment.");
      }
      await downloadImageUrlToDirectory(item.src, fileName, directoryHandle);
      const result = await uploadFolderToCloudinary(directoryHandle, settings);
      setDownloadMessage(`Downloaded the image.`);
      if (result.failed > 0) setError(`${result.failed} file(s) failed to upload.`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  async function onDownload(item: GenerationRecord) {
    setBusyId(item.id);
    setError(null);
    setDownloadMessage(null);
    try {
      const nextCount = await downloadGeneration(item);
      const directoryHandle = await chooseDownloadDirectory();
      const fileName = `${item.image_path.split("/").at(-1) || item.label.replace(/\s+/g, "-").toLowerCase() || "hearth-image"}`;

      if (directoryHandle) {
        await downloadImageUrlToDirectory(item.image_url, fileName, directoryHandle);
        const settings = await loadCloudinarySettings();
        if (!settings.cloudName || !settings.uploadPreset) {
          throw new Error("Cloudinary is not configured. Set the cloud name and unsigned upload preset in the admin panel or environment.");
        }
        const result = await uploadFolderToCloudinary(directoryHandle, settings);
        setDownloadMessage(`Downloaded the image.`);
        if (result.failed > 0) setError(`${result.failed} file(s) failed to upload.`);
      } else {
        downloadImageSrc(item.image_url, fileName);
        setDownloadMessage("Download successful.");
      }

      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, download_count: nextCount } : entry)),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(item: GenerationRecord) {
    setBusyId(item.id);
    setError(null);
    try {
      await removeGeneration(item);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this image.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
            Gallery · What came back
          </p>
          <h1 className="mt-5 font-display text-3xl font-medium leading-tight tracking-tight text-balance sm:text-4xl">
            Everything you’ve made, in one quiet room.
          </h1>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted text-pretty">
            A few studio studies stay here by default. Every image you generate is saved to your account, newest first.
          </p>
        </section>

        {error && (
          <p className="mt-6 rounded-2xl bg-clay/10 px-4 py-3 text-xs font-medium text-clay">{error}</p>
        )}

        {downloadMessage && (
          <p className="mt-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700">
            {downloadMessage}
          </p>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_GALLERY.map((item) => (
            <figure key={item.id} className="group">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/5">
                <img
                  src={item.src}
                  alt={item.prompt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <figcaption className="mt-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.prompt}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Studio study</p>
                  <button
                    type="button"
                    onClick={() => void onDownloadDefault(item)}
                    className="text-xs font-medium text-clay hover:underline"
                  >
                    Download
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}

          {loading ? (
            <p className="col-span-full text-sm text-muted">Loading your images…</p>
          ) : !user ? (
            <div className="col-span-full rounded-[20px] border border-dashed border-line bg-panel/60 p-8 text-center">
              <p className="font-display text-lg font-medium">Sign in to see images you generate.</p>
              <p className="mx-auto mt-2 max-w-[38ch] text-sm text-muted">
                Generated images are stored with your account so you can come back to them.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-panel transition-transform hover:-translate-y-0.5"
              >
                Sign in
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <figure key={item.id} className="group">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/5">
                  <img
                    src={item.image_url}
                    alt={item.prompt || item.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="mt-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {item.prompt || "No note added"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void onRemove(item)}
                      className="text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-clay disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                      {item.download_count > 0
                        ? `Downloaded ${item.download_count} time${item.download_count === 1 ? "" : "s"}`
                        : "Not downloaded yet"}
                    </p>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void onDownload(item)}
                      className="text-xs font-medium text-clay hover:underline disabled:opacity-40"
                    >
                      Download
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
