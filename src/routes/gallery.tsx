import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { readGallery, removeFromGallery, type GalleryItem } from "@/lib/gallery";

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
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    setItems(readGallery());
  }, []);

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
            Each image you generate in the studio finds its way here, newest first.
          </p>
        </section>

        {items.length === 0 ? (
          <div className="mt-12 rounded-[20px] border border-dashed border-line bg-panel/60 p-12 text-center">
            <p className="font-display text-lg font-medium">Nothing here yet.</p>
            <p className="mx-auto mt-2 max-w-[38ch] text-sm text-muted">
              Head to the studio, bring in a photo, and the images that come back will land here.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-panel transition-transform hover:-translate-y-0.5"
            >
              Open the studio
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <figure key={item.id} className="group">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/5">
                  <img
                    src={item.src}
                    alt={item.prompt || item.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {item.prompt || "No note added"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removeFromGallery(item.id);
                      setItems(readGallery());
                    }}
                    className="text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-clay"
                  >
                    Remove
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
