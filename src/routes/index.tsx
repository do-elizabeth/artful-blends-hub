import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import uploadPreview from "@/assets/upload-preview.jpg";
import resultWatercolor from "@/assets/result-watercolor.jpg";
import resultMorning from "@/assets/result-morning.jpg";
import resultWarmer from "@/assets/result-warmer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth — Image to image, made calm" },
      { name: "description", content: "Drop in a photo, describe the feeling, and let Hearth reshape it." },
      { property: "og:title", content: "Hearth — Image to image, made calm" },
      { property: "og:description", content: "Drop in a photo, describe the feeling, and let Hearth reshape it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STYLE_CHIPS = [
  "Watercolor",
  "Soft morning light",
  "Film grain",
  "Warmer",
  "Cooler",
  "Textured",
];

const RESULTS = [
  {
    id: "watercolor",
    label: "Watercolor, cool light",
    src: resultWatercolor,
    alt: "The uploaded mug reinterpreted as a loose watercolor wash in cool blue light",
  },
  {
    id: "morning",
    label: "Morning light, grain",
    src: resultMorning,
    alt: "The uploaded mug bathed in soft morning window light with faint film grain",
  },
  {
    id: "warmer",
    label: "Warmer, softer",
    src: resultWarmer,
    alt: "The uploaded mug rendered in warmer, softer tones with gentle texture",
  },
];

function Index() {
  const [uploadedImage, setUploadedImage] = useState<string>(uploadPreview);
  const [prompt, setPrompt] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["Watercolor"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(true);
  const [keptResult, setKeptResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleStyle = useCallback((style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setUploadedImage(result);
        setShowResults(false);
        setKeptResult(null);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const generate = useCallback(() => {
    setIsGenerating(true);
    setProgress(0);
    setShowResults(false);
    setKeptResult(null);

    const duration = 2200;
    const interval = 60;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setIsGenerating(false);
          setShowResults(true);
          return 100;
        }
        return next;
      });
    }, interval);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-clay font-display text-base font-medium text-panel">
            h
          </span>
          <span className="font-display text-lg font-medium tracking-tight">Hearth</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <a href="#" className="transition-colors hover:text-ink">Studio</a>
          <a href="#" className="transition-colors hover:text-ink">Gallery</a>
          <a href="#" className="transition-colors hover:text-ink">Notes</a>
        </nav>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-panel ring-1 ring-ink/10 transition-transform hover:-translate-y-0.5">
          Open account
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="-mt-2 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
            Studio · Image to image
          </p>
          <h1 className="mt-5 font-display text-3xl font-medium leading-tight tracking-tight text-ink text-balance sm:text-4xl">
            Bring a photo in. Leave with something new.
          </h1>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted text-pretty sm:text-[15px]">
            Drop in an image, add a line about how you’d like it to shift, and let Hearth reshape it in the light. No jargon, no fuss — just a calm table to work at.
          </p>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="rounded-[20px] bg-panel/70 p-6 ring-1 ring-black/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-medium">Your starting point</h2>
                <span className="text-xs text-muted">Step 1 of 3</span>
              </div>

              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line bg-paper/60 p-4"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-paper outline outline-1 -outline-offset-1 outline-black/5">
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Uploaded source image"
                      className="h-full w-full object-cover"
                      width={1024}
                      height={1024}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted">
                        Image
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={onFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper/40 py-2.5 pr-3 pl-3 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
              >
                <span className="grid size-4 place-items-center">+</span>
                Add another
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                Drag a file here, or choose from your device. PNG, JPG, up to 12 MB.
              </p>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="rounded-[20px] bg-panel/70 p-6 ring-1 ring-black/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-medium">How should it change?</h2>
                <span className="text-xs text-muted">Step 2 of 3</span>
              </div>

              <div className="mt-4">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full resize-none rounded-2xl border border-line bg-paper/50 p-4 text-[15px] leading-relaxed text-ink placeholder:text-muted/70 outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
                  placeholder="e.g. repainted as a watercolor, cooler light, a little more texture"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {STYLE_CHIPS.map((style) => {
                  const active = selectedStyles.includes(style);
                  return (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-clay bg-clay text-panel"
                          : "border-line bg-paper/40 text-muted hover:border-clay/40 hover:text-ink"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                <p className="text-xs text-muted">
                  {isGenerating ? `Settling… ${Math.round(progress)}%` : "Takes about 20 seconds."}
                </p>
                <button
                  onClick={generate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 rounded-full bg-clay py-2.5 pr-5 pl-5 text-sm font-medium text-panel ring-1 ring-clay/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span className="grid size-4 place-items-center text-panel">
                    {isGenerating ? (
                      <span
                        className="size-3.5 rounded-full border-2 border-panel/30 border-t-panel animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="size-1.5 rounded-full bg-panel" />
                    )}
                  </span>
                  {isGenerating ? "Generating" : "Generate"}
                </button>
              </div>

              {isGenerating && (
                <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-clay transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {showResults && (
          <section className="mt-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-lg font-medium">What came back</h2>
                <p className="mt-1 text-sm text-muted">
                  Three interpretations, gently varied. Pick the one that feels right.
                </p>
              </div>
              <span className="hidden rounded-full bg-sage/15 px-3 py-1 text-xs font-medium text-sage sm:inline-block">
                Ready
              </span>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {RESULTS.map((result) => {
                const isKept = keptResult === result.id;
                return (
                  <div key={result.id} className="group">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/5">
                      <img
                        src={result.src}
                        alt={result.alt}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-medium">{result.label}</p>
                      <button
                        onClick={() => setKeptResult(result.id)}
                        className={`text-xs font-medium transition-opacity ${
                          isKept
                            ? "text-clay opacity-100"
                            : "text-clay opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isKept ? "Kept" : "Keep"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-16 text-center text-sm text-muted">
          Hearth is a quiet place to turn the ordinary into the considered.
        </p>
      </main>
    </div>
  );
}
