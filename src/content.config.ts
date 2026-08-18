import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    category: z.string(),
    image: z.string().optional(),
  }),
});

// Catálogo público de cursos: solo metadatos y temario (títulos de lección).
// El contenido real de cada lección (vídeo, texto) vive en Supabase y se
// sirve solo a usuarios autenticados. El orden de `modules[].lessons[]`,
// aplanado, debe coincidir con `lesson_order` en la tabla `lessons` de
// Supabase (ver SUPABASE.md).
const courses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/courses" }),
  schema: z.object({
    title: z.string(),
    tagline: z.string().optional(),
    description: z.string(),
    image: z.string().optional(),
    level: z.string(),
    category: z.string(),
    price: z.string(),
    brand: z.enum(["droneduca", "novodrone"]).default("droneduca"),
    /** Miniatura horizontal (1600x900 recomendado) para las tarjetas del catálogo de /cursos. */
    thumbnail: z.string().optional(),
    includes: z.array(z.string()).optional(),
    forum: z.boolean().default(false),
    calendar: z.boolean().default(false),
    // "webinar": campus con Inicio/Clases en banner/Acerca de propios (cursos de pago). "classic": lista plana actual.
    campusDesign: z.enum(["classic", "webinar"]).default("classic"),
    whatsapp: z.boolean().default(false),
    whatsappUrl: z.string().optional(),
    // Botón de acción en el catálogo /cursos: texto del botón y enlace (interno o externo, p. ej. el
    // checkout de Novodrone o un enlace para agendar llamada). Si no hay ctaHref, se muestra "próximamente".
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    modules: z.array(
      z.object({
        title: z.string(),
        instructor: z.string().optional(),
        /** Banner horizontal (1600x900 recomendado) para la parrilla de Clases y la ficha de Acerca de. */
        bannerImage: z.string().optional(),
        lessons: z.array(z.string()),
      }),
    ),
  }),
});

export const collections = { blog, courses };
