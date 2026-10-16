import { isSupabaseConfigured, supabaseConfig } from "@/lib/site";

/**
 * ¿Existe /proyectos/<slug> en la versión publicada? Lo consulta el proxy en cada visita
 * a un proyecto, así que la lista se guarda en memoria:
 *  - un slug conocido se da por bueno durante 5 minutos;
 *  - un slug desconocido vuelve a preguntar (como mucho cada 10 s), para que un proyecto
 *    recién publicado funcione al momento.
 * Devuelve null si no se puede saber (sin Supabase, sin versión publicada o error):
 * entonces decide la página, como siempre.
 */
const FRESH_MS = 5 * 60_000;
const RETRY_MS = 10_000;

let cache: { slugs: Set<string> | null; at: number } | null = null;
let inflight: Promise<Set<string> | null> | null = null;

async function fetchSlugs(): Promise<Set<string> | null> {
  try {
    const res = await fetch(`${supabaseConfig.url}/rest/v1/rpc/published_project_slugs`, {
      method: "POST",
      headers: { apikey: supabaseConfig.publishableKey, "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as string[] | null;
    return Array.isArray(data) ? new Set(data) : null;
  } catch {
    return null;
  }
}

async function load(): Promise<Set<string> | null> {
  inflight ??= fetchSlugs().finally(() => (inflight = null));
  const slugs = await inflight;
  cache = { slugs, at: Date.now() };
  return slugs;
}

export async function isPublishedProject(slug: string): Promise<boolean | null> {
  if (!isSupabaseConfigured) return null;
  const age = cache ? Date.now() - cache.at : Infinity;
  let slugs = cache?.slugs ?? null;
  if (!cache || age > FRESH_MS || (age > RETRY_MS && !slugs?.has(slug))) slugs = await load();
  if (!slugs) return null;
  return slugs.has(slug);
}
