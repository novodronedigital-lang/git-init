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

const MAX_PHOTO_DIMENSION = 2000;
const PHOTO_JPEG_QUALITY = 0.82;

/**
 * Redimensiona y recomprime una foto a JPEG antes de subirla — las fotos de móvil sin tocar pesan varios MB
 * cada una, y eso es lo que hacía la galería pública tan lenta de cargar. 2000px de lado más largo es de sobra
 * para verse a pantalla completa. Si algo falla (formato raro, navegador sin soporte), sube el archivo original
 * tal cual en vez de romper la subida.
 */
export async function compressPhoto(file: File): Promise<{ blob: Blob; filename: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se ha podido preparar el lienzo de compresión");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY));
    if (!blob) throw new Error("La compresión no ha devuelto ningún archivo");

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return { blob, filename: `${baseName}.jpg` };
  } catch {
    return { blob: file, filename: file.name };
  }
}
