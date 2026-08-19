export interface Gallery {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string;
  is_published: boolean;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  gallery_id: string;
  storage_path: string;
  media_type: "photo" | "video";
  position: number;
  created_at: string;
}

export const GALLERY_BUCKET = "gallery-media";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug legible + sufijo aleatorio: fácil de leer, pero imposible de adivinar. */
export function generateGallerySlug(title: string): string {
  const base = slugify(title) || "galeria";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 8);
  return `${base}-${suffix}`;
}
