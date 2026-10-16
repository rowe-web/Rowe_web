"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, check, requireRole } from "@/admin/auth";
import { releaseMedia } from "@/admin/storage-cleanup";
import { createSupabaseServer } from "@/lib/supabase/server";

const uuid = z.string().uuid();

/** Texto alternativo (accesibilidad y SEO). Se guarda solo al escribir. */
export async function saveMediaAlt(id: string, alt: string) {
  return action(async () => {
    await requireRole("staff");
    const text = z.string().max(300).parse(alt.trim());
    const supabase = await createSupabaseServer();
    check(await supabase.from("media").update({ alt: text }).eq("id", uuid.parse(id)).select("id").single());
  });
}

/**
 * Borra un archivo de la biblioteca y del almacenamiento (y su póster si es un vídeo).
 * Donde se usaba queda vacío (la base de datos pone esas referencias a null). Si la web
 * publicada aún lo usa, el archivo se borra al publicar (para no dejar imágenes rotas).
 */
export async function deleteMedia(id: string) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    const row = check(await supabase.from("media").select("id, bucket, path, poster_id").eq("id", uuid.parse(id)).single())!;
    const rows = [row];
    if (row.poster_id) {
      const { data: poster } = await supabase.from("media").select("id, bucket, path, poster_id").eq("id", row.poster_id).maybeSingle();
      if (poster) rows.push(poster);
    }
    const published = await releaseMedia(supabase);
    check(await supabase.from("media").delete().in("id", rows.map((r) => r.id)).select("id"));
    const now = rows.filter((r) => !published[r.id]);
    if (now.length) {
      // Si no se pudiera borrar solo ocuparía espacio: no rompe nada
      const { error } = await supabase.storage.from(row.bucket).remove(now.map((r) => r.path));
      if (error) console.error("[admin] storage remove", error.message);
    }
    refresh();
    return { deferred: now.length < rows.length };
  });
}
