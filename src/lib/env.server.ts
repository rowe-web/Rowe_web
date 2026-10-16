import "server-only";
import { z } from "zod";

/**
 * Variables solo de servidor. Se validan al usarse, con un mensaje claro si falta alguna.
 */
const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20, "Falta SUPABASE_SECRET_KEY (clave secret de Supabase)"),
  /** smtp (Gmail con contraseña de aplicación) · resend (con dominio propio) · vacío = sin envío */
  EMAIL_PROVIDER: z.enum(["smtp", "resend", ""]).default(""),
  EMAIL_FROM: z.string().default(""),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  /** "1" = no se envía ningún email de verdad (pruebas automáticas): se da por enviado. */
  EMAIL_DRY_RUN: z.string().default(""),
  /** Secreto para las tareas programadas (reintento de emails). */
  CRON_SECRET: z.string().default(""),
  /** Sal para anonimizar IPs (si falta, se deriva de la clave secret). */
  IP_HASH_SALT: z.string().default(""),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `· ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuración del servidor incompleta (.env.local):\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
