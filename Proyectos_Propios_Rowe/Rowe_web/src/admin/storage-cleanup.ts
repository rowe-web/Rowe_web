import "server-only";
import type { createSupabaseServer } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServer>>;
type SnapMedia = Record<string, { bucket: string; path: string }>;

/** Medios de la versión publicada `version` (o la última si no se indica). */
export async function releaseMedia(supabase: Client, version?: number): Promise<SnapMedia> {
  let q = supabase.from("releases").select("version, media:snapshot->media");
  q = version === undefined ? q.order("version", { ascending: false }).limit(1) : q.eq("version", version).limit(1);
  const { data } = await q;
  return ((data?.[0] as { media?: SnapMedia } | undefined)?.media ?? {}) as SnapMedia;
}

/**
 * Tras publicar: borra del almacenamiento los archivos que la versión anterior aún
 * usaba pero que ya se eliminaron de la biblioteca (se esperó a publicar para que la
 * web nunca mostrara una imagen rota).
 */
export async function removeOrphanFiles(supabase: Client, newVersion: number) {
  if (newVersion <= 1) return;
  const prev = await releaseMedia(supabase, newVersion - 1);
  const ids = Object.keys(prev);
  if (!ids.length) return;
  const { data: alive } = await supabase.from("media").select("id").in("id", ids);
  const keep = new Set((alive ?? []).map((r) => r.id));
  const byBucket = new Map<string, string[]>();
  for (const [id, m] of Object.entries(prev)) {
    if (keep.has(id)) continue;
    byBucket.set(m.bucket, [...(byBucket.get(m.bucket) ?? []), m.path]);
  }
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error("[admin] limpieza de archivos", error.message);
  }
}
