import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/lib/env.server";

export interface Mail {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Cabeceras extra (p. ej. Auto-Submitted en los avisos automáticos). */
  headers?: Record<string, string>;
  attachments?: { filename: string; path?: string; content?: Buffer; cid?: string; contentDisposition?: "inline" | "attachment" }[];
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("El envío de emails no está configurado (EMAIL_PROVIDER en .env.local)");
  }
}

let smtp: Transporter | null = null;

/**
 * Dirección desde la que sale el correo de ROWE (avisos y respuestas desde el panel),
 * o "" si el envío no está configurado. Con Gmail es la cuenta SMTP_USER.
 */
export function mailSender(): string {
  const env = serverEnv();
  if (env.EMAIL_PROVIDER === "smtp") return env.SMTP_USER && env.SMTP_PASSWORD ? env.SMTP_USER : "";
  if (env.EMAIL_PROVIDER === "resend") return env.RESEND_API_KEY ? (env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM) : "";
  return "";
}

/**
 * El mensaje SMTP tal y como sale, con cabeceras RFC 5322 limpias y nada fuera de lo común:
 *  - From = la cuenta autenticada, siempre (si no coinciden, Gmail lo reescribe y el email
 *    pierde credibilidad), con nombre «ROWE»; Reply-To coherente (la misma cuenta salvo que el
 *    email diga otra cosa: los avisos internos responden al cliente).
 *  - Message-ID único del dominio de la cuenta, Date y prioridad normal explícitos.
 *  - multipart/alternative: versión de texto plano SIEMPRE junto a la HTML.
 */
export function smtpMessage(mail: Mail, account: string) {
  if (!mail.text.trim()) throw new Error("Falta la versión de texto plano del email");
  const domain = account.split("@")[1] || "localhost";
  return {
    from: { name: "ROWE", address: account },
    to: mail.to,
    replyTo: mail.replyTo || account,
    subject: mail.subject,
    messageId: `<${randomUUID()}@${domain}>`,
    date: new Date(),
    text: mail.text,
    html: mail.html,
    textEncoding: "quoted-printable" as const,
    // Sin firma de la librería: ni X-Mailer ni el prefijo «NmP» en los separadores MIME
    xMailer: false as const,
    boundaryPrefix: "--_rowe",
    headers: { "X-Priority": "3 (Normal)", Importance: "Normal", ...mail.headers },
    attachments: mail.attachments,
  };
}

/**
 * Envía un email con el proveedor configurado:
 *  - smtp:   Gmail con contraseña de aplicación (sin dominio propio).
 *  - resend: API de Resend (cuando haya dominio verificado).
 * Lanza un error si falla: quien llama lo registra en la cola y lo reintenta.
 */
export async function sendMail(mail: Mail): Promise<{ id: string }> {
  const env = serverEnv();
  // Pruebas automáticas: nunca llega nada a ningún buzón (ni a los del equipo)
  if (env.EMAIL_DRY_RUN === "1" && env.EMAIL_PROVIDER) return { id: `dry-run-${Date.now()}` };

  if (env.EMAIL_PROVIDER === "smtp") {
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) throw new EmailNotConfiguredError();
    smtp ??= nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
    const info = await smtp.sendMail(smtpMessage(mail, env.SMTP_USER));
    return { id: info.messageId };
  }

  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new EmailNotConfiguredError();
    if (!mail.text.trim()) throw new Error("Falta la versión de texto plano del email");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: mail.to,
        reply_to: mail.replyTo || mailSender(),
        headers: mail.headers,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: mail.attachments
          ?.filter((a) => a.content)
          .map((a) => ({ filename: a.filename, content: a.content!.toString("base64"), content_id: a.cid })),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { id: string };
    return { id: body.id };
  }

  throw new EmailNotConfiguredError();
}
