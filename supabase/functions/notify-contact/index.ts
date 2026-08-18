const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  entity?: string;
  activity?: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// La llama el propio formulario público de /contacto, sin sesión — no requiere verificación de JWT.
// El mensaje ya se ha guardado en `contact_messages` desde el cliente antes de llegar aquí; esta función
// solo se encarga del aviso por email, así que un fallo aquí nunca hace perder el mensaje.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response("Notify is not configured yet (missing RESEND_API_KEY secret)", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const payload = (await req.json()) as Partial<ContactPayload>;
    if (!payload.name || !payload.email || !payload.message) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const notifyTo = Deno.env.get("NOTIFY_EMAIL") ?? "hola@droneduca.com";
    const fromAddress = Deno.env.get("NOTIFY_FROM") ?? "DronEduca <onboarding@resend.dev>";

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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [notifyTo],
        reply_to: payload.email,
        subject: `Nuevo mensaje de contacto: ${payload.name}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      return new Response(`Error sending email (${resendResponse.status}): ${text}`, {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Unexpected error: ${message}`, { status: 500, headers: corsHeaders });
  }
});
