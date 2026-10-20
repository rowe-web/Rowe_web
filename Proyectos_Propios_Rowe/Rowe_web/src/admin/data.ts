import "server-only";
import type { MediaRow } from "@/admin/media/upload";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Biblioteca de medios (para los selectores de los editores). */
export async function loadMedia(): Promise<MediaRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false }).limit(1000);
  return (data ?? []) as MediaRow[];
}


/** Recorre un JSON y apunta cada `*_media_id` que encuentre. */
function collect(value: unknown, add: (id: string) => void) {
  if (Array.isArray(value)) value.forEach((v) => collect(v, add));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k.endsWith("_media_id") && typeof v === "string") add(v);
      else collect(v, add);
    }
  }
}

/** Dónde se usa cada medio: «Hero», «Proyectos · Clínica Dental Mar»… (para avisar antes de borrar). */
export async function mediaUsage(): Promise<Record<string, string[]>> {
  const supabase = await createSupabaseServer();
  const [scenes, projects, gallery, services, pages, settings] = await Promise.all([
    supabase.from("scenes").select("name, media_id, poster_id, data"),
    supabase.from("projects").select("id, title, cover_id, video_id"),
    supabase.from("project_media").select("project_id, media_id"),
    supabase.from("services").select("title, media_id"),
    supabase.from("pages").select("title, og_media_id, blocks"),
    supabase.from("site_settings").select("key, label, value"),
  ]);
  const uses: Record<string, string[]> = {};
  const add = (id: string | null | undefined, where: string) => {
    if (!id) return;
    const list = (uses[id] ??= []);
    if (!list.includes(where)) list.push(where);
  };
  for (const s of scenes.data ?? []) {
    add(s.media_id, s.name);
    add(s.poster_id, s.name);
    collect(s.data, (id) => add(id, s.name));
  }
  const titles = new Map((projects.data ?? []).map((p) => [p.id, p.title || "Sin título"]));
  for (const p of projects.data ?? []) {
    add(p.cover_id, `Proyectos · ${titles.get(p.id)}`);
    add(p.video_id, `Proyectos · ${titles.get(p.id)}`);
  }
  for (const g of gallery.data ?? []) add(g.media_id, `Proyectos · ${titles.get(g.project_id) ?? ""}`);
  for (const s of services.data ?? []) add(s.media_id, `Servicios · ${s.title}`);
  for (const p of pages.data ?? []) {
    add(p.og_media_id, `Página · ${p.title}`);
    collect(p.blocks, (id) => add(id, `Página · ${p.title}`));
  }
  for (const s of settings.data ?? []) collect(s.value, (id) => add(id, `Ajustes · ${s.label || s.key}`));
  return uses;
}
