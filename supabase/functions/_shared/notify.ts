import nodemailer from "npm:nodemailer@^9";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

interface SendEmailOptions {
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envía el aviso por SMTP directo, usando el buzón de correo del propio hosting (Sered) en vez de un
 * servicio externo tipo Resend — así no depende de ninguna cuenta de terceros. El puerto tiene que ser
 * el 465 (TLS implícito): Deno Deploy, donde corren las Edge Functions, bloquea las conexiones salientes
 * al 25 y al 587.
 */
export async function sendNotificationEmail({ subject, html, replyTo }: SendEmailOptions): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = Deno.env.get("SMTP_HOST");
  const port = Deno.env.get("SMTP_PORT");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !port || !user || !pass) {
    return { ok: false, error: "Notify is not configured yet (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS secrets)" };
  }

  // NOTIFY_EMAIL admite varias direcciones separadas por comas, para que el aviso llegue a más de una
  // persona y se pueda responder desde cualquiera de ellas.
  const notifyTo = (Deno.env.get("NOTIFY_EMAIL") ?? "hola@droneduca.com,iker.luzon@droneduca.es")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const fromAddress = Deno.env.get("NOTIFY_FROM") ?? user;

  const transport = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({ from: fromAddress, to: notifyTo, replyTo, subject, html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
