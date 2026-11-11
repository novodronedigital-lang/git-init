import { createClient } from "npm:@supabase/supabase-js@2";

// Baja de un clic (RFC 8058) para la cabecera List-Unsubscribe de los correos de talleres.
// - POST: lo hace el propio Gmail/Yahoo/Outlook cuando el usuario pulsa "Cancelar suscripción".
// - GET: por si algún cliente abre la URL en el navegador; redirige a la página /baja de la web.
// Va sin verificación de JWT: el token (uuid aleatorio, uno por inscripción) es la única credencial.
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://droneduca.es";

Deno.serve(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

  if (isUuid) {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    await supabase.rpc("unsubscribe_workshop_email", { p_token: token });
  }

  if (req.method === "POST") {
    return new Response("OK", { status: isUuid ? 200 : 400 });
  }
  return Response.redirect(`${SITE_URL}/baja?t=${encodeURIComponent(token)}`, 302);
});
