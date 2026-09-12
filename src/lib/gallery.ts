import resultMorning from "@/assets/result-morning.jpg";
import resultWarmer from "@/assets/result-warmer.jpg";
import resultWatercolor from "@/assets/result-watercolor.jpg";

export type DefaultGalleryItem = {
  id: string;
  src: string;
  label: string;
  prompt: string;
  default: true;
};

export const DEFAULT_GALLERY: DefaultGalleryItem[] = [
  {
    id: "default-watercolor",
    src: resultWatercolor,
    label: "Watercolor",
    prompt: "A quiet watercolor reading of morning light on the table.",
    default: true,
  },
  {
    id: "default-morning",
    src: resultMorning,
    label: "Soft morning light",
    prompt: "Cooler air, softer edges, the hour just after sunrise.",
    default: true,
  },
  {
    id: "default-warmer",
    src: resultWarmer,
    label: "Warmer",
    prompt: "A warmer grade, film grain, and a little more texture.",
    default: true,
  },
];

export function downloadImageSrc(src: string, filename: string) {
  const link = document.createElement("a");
  link.href = src;
  link.download = filename;
  link.rel = "noopener";
  link.target = "_self";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
