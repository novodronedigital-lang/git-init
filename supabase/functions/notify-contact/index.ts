import { corsHeaders, escapeHtml, sendNotificationEmail } from "../_shared/notify.ts";

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  entity?: string;
  activity?: string;
  message: string;
}

// La llama el propio formulario público de /contacto, sin sesión — no requiere verificación de JWT.
// El mensaje ya se ha guardado en `contact_messages` desde el cliente antes de llegar aquí; esta función
// solo se encarga del aviso por email, así que un fallo aquí nunca hace perder el mensaje.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Partial<ContactPayload>;
    if (!payload.name || !payload.email || !payload.message) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const rows = [
      ["Nombre", payload.name],
      ["Email", payload.email],
      ["Teléfono", payload.phone || "—"],
      ["Colegio / entidad", payload.entity || "—"],
      ["Tipo de actividad", payload.activity || "—"],
    ]
      .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#6480a9;">${label}</td><td>${escapeHtml(value)}</td></tr>`)
      .join("");

    const html = `
      <div style="font-family:sans-serif;font-size:14px;color:#131c2e;">
        <h2 style="margin:0 0 12px;">Nuevo mensaje de contacto</h2>
        <table>${rows}</table>
        <p style="margin-top:16px;white-space:pre-line;">${escapeHtml(payload.message)}</p>
      </div>
    `;

    const result = await sendNotificationEmail({
      subject: `Nuevo mensaje de contacto: ${payload.name}`,
      html,
      replyTo: payload.email,
    });

    if (!result.ok) {
      return new Response(`Error sending email: ${result.error}`, { status: 500, headers: corsHeaders });
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Unexpected error: ${message}`, { status: 500, headers: corsHeaders });
  }
});
