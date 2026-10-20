import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/** IP del visitante (detrás del proxy de la plataforma). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "0.0.0.0").trim();
}

/** Huella anónima de la IP (no se guarda la IP real): sirve para limitar envíos. */
export function hashIp(ip: string): string {
  const env = serverEnv();
  const salt = env.IP_HASH_SALT || env.SUPABASE_SECRET_KEY.slice(-24);
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Rechaza envíos desde otras webs (formularios ajenos que apunten a nuestra API).
 * Las peticiones sin cabecera Origin (herramientas, servidor) se permiten.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
