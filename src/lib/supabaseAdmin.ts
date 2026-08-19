import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service-role key, SOLO para usar en build time (frontmatter de Astro, que corre en Node
 * durante `astro build`). Nunca importar esto desde un <script> de cliente — la key bypassa toda RLS.
 *
 * Se usa para generar las páginas estáticas de /galeria/[slug]: las tablas `galleries`/`gallery_items` no
 * tienen ninguna policy de lectura pública (ver supabase/migrations/20260819120000_gallery.sql), así que la
 * anon key del navegador nunca puede listarlas — solo este cliente, en build time, puede.
 */
export function getSupabaseAdmin() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY no configurada — no se generará ninguna página de /galeria en este build.",
    );
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
