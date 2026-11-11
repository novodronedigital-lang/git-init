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

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  /** Versión en texto plano: los filtros antispam penalizan los correos que solo traen HTML. */
  text: string;
  replyTo?: string;
  /** URL de baja de un clic (RFC 8058): Gmail y Yahoo la exigen para envíos comerciales. */
  unsubscribeUrl?: string;
}

/**
 * Abre UNA conexión SMTP y envía los correos uno a uno (cada destinatario recibe el suyo, nunca en copia
 * oculta masiva), con una pausa corta entre cada uno para no disparar los límites anti-spam del hosting.
 */
export async function sendEmails(
  emails: OutgoingEmail[],
  { delayMs = 1500 }: { delayMs?: number } = {},
): Promise<{ sent: number; failed: { to: string; error: string }[] } | { error: string }> {
  const host = Deno.env.get("SMTP_HOST");
  const port = Deno.env.get("SMTP_PORT");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !port || !user || !pass) {
    return { error: "El envío de correos no está configurado (faltan los secrets SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)" };
  }

  const fromAddress = Deno.env.get("MARKETING_FROM") ?? `DronEduca <${user}>`;

  const transport = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 1,
  });

  let sent = 0;
  const failed: { to: string; error: string }[] = [];

  for (const [i, email] of emails.entries()) {
    try {
      await transport.sendMail({
        from: fromAddress,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: email.unsubscribeUrl
          ? {
              "List-Unsubscribe": `<${email.unsubscribeUrl}>, <mailto:hola@droneduca.com?subject=Baja>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
          : undefined,
      });
      sent += 1;
    } catch (err) {
      failed.push({ to: email.to, error: err instanceof Error ? err.message : String(err) });
    }
    if (i < emails.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  transport.close();
  return { sent, failed };
}
