import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, escapeHtml, sendEmails, type OutgoingEmail } from "../_shared/notify.ts";

// Envía el correo de "¿qué tal el taller?" + cupón de descuento a los inscritos de un taller que dieron
// consentimiento comercial expreso y no se han dado de baja. Solo la puede llamar un admin.
//
// Los envíos van por tandas (BATCH_SIZE por llamada) porque cada correo lleva una pausa para no saturar el
// SMTP del hosting, y las Edge Functions tienen un límite de tiempo por petición. El panel de admin vuelve
// a llamar hasta que `remaining` es 0. Cada inscripción se marca al enviarse, así que repetir nunca duplica.
//
// Body: { workshopId: string, testEmail?: string }  — con testEmail, envía UNA prueba solo a esa dirección
// (sin marcar nada como enviado), para revisar el correo antes de mandarlo de verdad.

const BATCH_SIZE = 40;
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://droneduca.es";
const STORE_URL = Deno.env.get("STORE_URL") ?? "https://novodrone.com";
const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

interface Workshop {
  id: string;
  title: string;
  town: string;
  discount_code: string | null;
}

function buildEmail(workshop: Workshop, firstName: string, unsubscribeToken: string | null): Omit<OutgoingEmail, "to"> {
  const code = workshop.discount_code ?? "";
  const unsubscribePageUrl = unsubscribeToken ? `${SITE_URL}/baja?t=${unsubscribeToken}` : `${SITE_URL}/baja`;
  const oneClickUrl = unsubscribeToken ? `${FUNCTIONS_URL}/email-unsubscribe?t=${unsubscribeToken}` : undefined;
  const greeting = firstName ? `Hola, ${escapeHtml(firstName)}:` : "Hola:";

  const subject = `¿Qué tal el taller de drones en ${workshop.town}? Tu descuento está dentro`;

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f2f5fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5fa;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#131c2e;">
        <tr><td style="padding:28px 32px 8px;">
          <img src="${SITE_URL}/brand/logo-lockup-on-light.png" alt="DronEduca" width="170" style="display:block;border:0;height:auto;">
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;">${greeting}</p>
          <p style="margin:0 0 14px;">¡Gracias por venir al taller de drones en <strong>${escapeHtml(workshop.town)}</strong>! Esperamos que lo pasarais genial volando con nosotros.</p>
          <p style="margin:0 0 14px;"><strong>¿Qué te ha parecido?</strong> Responde a este correo y cuéntanoslo: lo leemos todo y nos ayuda muchísimo a preparar los próximos talleres.</p>
        </td></tr>
        ${
          code
            ? `<tr><td style="padding:8px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ec;border:2px dashed #fb8500;border-radius:12px;">
            <tr><td align="center" style="padding:20px 16px;font-size:14px;line-height:1.5;">
              <p style="margin:0 0 6px;">Como agradecimiento, tienes <strong>10€ de descuento</strong> en la tienda Novodrone<br>en compras superiores a 50€ con el código:</p>
              <p style="margin:8px 0 14px;font-size:26px;font-weight:bold;letter-spacing:2px;color:#b34f02;">${escapeHtml(code)}</p>
              <a href="${STORE_URL}" style="display:inline-block;background:#fb8500;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;">Ir a la tienda</a>
            </td></tr>
          </table>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:24px 32px 8px;font-size:15px;line-height:1.6;">
          <p style="margin:0;">¡Hasta el próximo vuelo!<br><strong>El equipo de DronEduca</strong></p>
        </td></tr>
        <tr><td align="center" style="padding:20px 32px 8px;font-size:12px;color:#6480a9;">
          Powered by <a href="${STORE_URL}" style="color:#103b96;font-weight:bold;text-decoration:none;">Novodrone</a>
        </td></tr>
        <tr><td style="padding:12px 32px 28px;font-size:11px;line-height:1.5;color:#99abc9;border-top:1px solid #e2e8f2;">
          Recibes este correo porque al inscribirte en el taller aceptaste recibir comunicaciones de DronEduca y Novodrone.
          SJM TECH S.COOP · CIF F99553935 · Calle Sierra de Guara 2, Zaragoza.
          <a href="${unsubscribePageUrl}" style="color:#6480a9;">Darme de baja</a> ·
          <a href="${SITE_URL}/privacidad" style="color:#6480a9;">Privacidad</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    firstName ? `Hola, ${firstName}:` : "Hola:",
    "",
    `¡Gracias por venir al taller de drones en ${workshop.town}! Esperamos que lo pasarais genial volando con nosotros.`,
    "",
    "¿Qué te ha parecido? Responde a este correo y cuéntanoslo: lo leemos todo.",
    ...(code
      ? ["", `Como agradecimiento, tienes 10€ de descuento en la tienda Novodrone en compras superiores a 50€ con el código: ${code}`, STORE_URL]
      : []),
    "",
    "¡Hasta el próximo vuelo!",
    "El equipo de DronEduca — Powered by Novodrone",
    "",
    "---",
    "Recibes este correo porque al inscribirte en el taller aceptaste recibir comunicaciones de DronEduca y Novodrone.",
    "SJM TECH S.COOP · CIF F99553935 · Calle Sierra de Guara 2, Zaragoza.",
    `Darme de baja: ${unsubscribePageUrl}`,
  ].join("\n");

  return { subject, html, text, replyTo: "hola@droneduca.com", unsubscribeUrl: oneClickUrl };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: profile } = await userClient.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const { workshopId, testEmail } = (await req.json()) as { workshopId?: string; testEmail?: string };
    if (!workshopId) return new Response("Falta workshopId", { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: workshop, error: workshopError } = await admin
      .from("workshops")
      .select("id, title, town, discount_code")
      .eq("id", workshopId)
      .maybeSingle();
    if (workshopError || !workshop) return new Response("Taller no encontrado", { status: 404, headers: corsHeaders });

    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (testEmail) {
      const email = { to: testEmail, ...buildEmail(workshop as Workshop, "", null) };
      email.subject = `[PRUEBA] ${email.subject}`;
      const result = await sendEmails([email], { delayMs: 0 });
      if ("error" in result) return new Response(result.error, { status: 500, headers: corsHeaders });
      if (result.failed.length) return new Response(result.failed[0].error, { status: 500, headers: corsHeaders });
      return json({ sent: 1, failed: 0, remaining: 0, test: true });
    }

    const pendingQuery = () =>
      admin
        .from("workshop_registrations")
        .select("id, contact_name, email, unsubscribe_token", { count: "exact" })
        .eq("workshop_id", workshopId)
        .eq("marketing_consent", true)
        .is("unsubscribed_at", null)
        .is("followup_sent_at", null)
        .order("created_at");

    const { data: pending, error: pendingError } = await pendingQuery().limit(BATCH_SIZE);
    if (pendingError) return new Response(pendingError.message, { status: 500, headers: corsHeaders });

    // Si alguien se inscribió dos veces con el mismo email, que solo reciba un correo.
    const seen = new Set<string>();
    const batch = (pending ?? []).filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
    const duplicates = (pending ?? []).filter((r) => !batch.includes(r));

    const emails = batch.map((r) => ({
      to: r.email,
      ...buildEmail(workshop as Workshop, r.contact_name.trim().split(/\s+/)[0] ?? "", r.unsubscribe_token),
    }));

    const result = await sendEmails(emails, { delayMs: 1000 });
    if ("error" in result) return new Response(result.error, { status: 500, headers: corsHeaders });

    const failedEmails = new Set(result.failed.map((f) => f.to));
    const sentIds = [...batch.filter((r) => !failedEmails.has(r.email)), ...duplicates].map((r) => r.id);
    const now = new Date().toISOString();
    if (sentIds.length) {
      await admin.from("workshop_registrations").update({ followup_sent_at: now }).in("id", sentIds);
    }

    const { count: remaining } = await pendingQuery().limit(1);
    if ((remaining ?? 0) === 0 && result.failed.length === 0) {
      await admin.from("workshops").update({ followup_sent_at: now }).eq("id", workshopId);
    }

    return json({
      sent: result.sent,
      failed: result.failed.length,
      failedDetail: result.failed,
      // Los que fallan no se marcan como enviados: no cuentan como "pendientes" de esta tanda para no hacer bucle.
      remaining: Math.max(0, (remaining ?? 0) - result.failed.length),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Unexpected error: ${message}`, { status: 500, headers: corsHeaders });
  }
});
