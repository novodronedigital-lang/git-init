const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupPayload {
  fullName: string;
  email: string;
  phone?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// La llama el propio formulario público de /registro justo después de crear la cuenta (con o sin sesión activa
// según si Supabase pide confirmar el email), así que va sin verificación de JWT — igual que notify-contact.
// Un fallo aquí nunca hace perder el registro, que ya se ha creado en Supabase Auth antes de llegar aquí.
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

    const payload = (await req.json()) as Partial<SignupPayload>;
    if (!payload.fullName || !payload.email) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const notifyTo = Deno.env.get("NOTIFY_EMAIL") ?? "hola@droneduca.com";
    const fromAddress = Deno.env.get("NOTIFY_FROM") ?? "DronEduca <onboarding@resend.dev>";

    const html = `
      <div style="font-family:sans-serif;font-size:14px;color:#131c2e;">
        <h2 style="margin:0 0 12px;">Nueva cuenta creada en el campus</h2>
        <table>
          <tr><td style="padding:4px 12px 4px 0;color:#6480a9;">Nombre</td><td>${escapeHtml(payload.fullName)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6480a9;">Email</td><td>${escapeHtml(payload.email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6480a9;">Teléfono</td><td>${escapeHtml(payload.phone || "—")}</td></tr>
        </table>
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
        subject: `Nueva cuenta: ${payload.fullName}`,
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
