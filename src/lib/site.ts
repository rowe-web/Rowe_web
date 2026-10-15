/**
 * Configuración pública del sitio, siempre a partir de variables de entorno.
 * Nunca escribas el dominio a mano: cambia NEXT_PUBLIC_SITE_URL.
 */

function normalizeUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim() || "http://localhost:3000";
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL no es una URL válida: «${value}»`);
  }
}

export const siteUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** true solo cuando se active explícitamente el día del lanzamiento. */
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/** URL absoluta a partir de una ruta: absoluteUrl("/proyectos") */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteUrl).toString();
}

/** Dominio sin protocolo, para mostrar (pie, PDF, vista previa de Google). */
export const siteHost = new URL(siteUrl).host;

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(
  supabaseConfig.url && supabaseConfig.publishableKey && !supabaseConfig.url.includes("TU-PROYECTO"),
);
