import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/site";
import type { SiteSnapshot } from "./types";

/** Etiqueta de caché de todo el contenido público. Se invalida al publicar desde el panel. */
export const SITE_CACHE_TAG = "site";

/**
 * Última versión publicada de la web. Se cachea indefinidamente y se renueva
 * solo cuando un administrador publica (revalidateTag(SITE_CACHE_TAG)).
 * Devuelve null si Supabase todavía no está configurado.
 */
export async function getPublishedSite(): Promise<SiteSnapshot | null> {
  "use cache";
  cacheLife("max");
  cacheTag(SITE_CACHE_TAG);

  if (!isSupabaseConfigured) return null;

  const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("latest_release");
  if (error) {
    throw new Error(`No se pudo leer la versión publicada: ${error.message}`);
  }
  return (data as SiteSnapshot | null) ?? null;
}
