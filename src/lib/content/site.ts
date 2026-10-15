import "server-only";
import { buildFallbackSnapshot } from "@/content/fallback";
import { isSupabaseConfigured } from "@/lib/site";
import { getPublishedSite } from "./published";
import type { SiteSnapshot } from "./types";

/**
 * Contenido que ve la web pública: la última versión publicada.
 * Solo si Supabase no está configurado (o aún no hay ninguna versión publicada) se usa
 * el contenido inicial del diseño, para que la web nunca salga vacía en local.
 */
export async function loadSite(): Promise<SiteSnapshot> {
  if (!isSupabaseConfigured) return buildFallbackSnapshot();
  return (await getPublishedSite()) ?? buildFallbackSnapshot();
}
