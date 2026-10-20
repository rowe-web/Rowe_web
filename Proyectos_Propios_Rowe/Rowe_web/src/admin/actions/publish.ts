"use server";

import { refresh, updateTag } from "next/cache";
import { action, check, requireRole } from "@/admin/auth";
import { removeOrphanFiles } from "@/admin/storage-cleanup";
import { SITE_CACHE_TAG } from "@/lib/content/published";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Publica el borrador: nueva versión pública y la web se actualiza al momento. Solo admin. */
export async function publishSite(note = "") {
  return action(async () => {
    await requireRole("admin");
    const supabase = await createSupabaseServer();
    const version = check(await supabase.rpc("publish_release", { p_note: note.slice(0, 200) })) as number;
    updateTag(SITE_CACHE_TAG);
    await removeOrphanFiles(supabase, version).catch((e) => console.error("[admin] limpieza", e));
    refresh();
    return { version };
  });
}

/** Vuelve a publicar una versión anterior completa. Solo admin. */
export async function republishVersion(version: number) {
  return action(async () => {
    await requireRole("admin");
    const supabase = await createSupabaseServer();
    const v = check(await supabase.rpc("republish_release", { p_version: version })) as number;
    updateTag(SITE_CACHE_TAG);
    refresh();
    return { version: v };
  });
}
