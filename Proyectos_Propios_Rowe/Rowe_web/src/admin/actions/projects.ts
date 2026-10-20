"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const uuid = z.string().uuid();

const projectSchema = z.object({
  title: z.string().trim().min(1, "El proyecto necesita un título.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Falta la dirección (slug).")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "La dirección solo admite minúsculas, números y guiones."),
  client: z.string().max(120),
  sector: z.string().max(80),
  year: z.number().int().min(2000).max(2100).nullable(),
  category: z.enum(["Web", "Audiovisual", "Web + Audiovisual"]),
  summary: z.string().max(600),
  challenge: z.string().max(2000),
  solution: z.string().max(2000),
  result: z.string().max(2000),
  metrics: z.array(z.object({ value: z.string().max(20), label: z.string().max(60) })).max(6),
  cover_id: uuid.nullable(),
  video_id: uuid.nullable(),
  client_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || v === "https://" || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v), "El enlace del cliente debe ser una dirección completa (https://…)."),
  seo_title: z.string().max(120),
  seo_description: z.string().max(300),
  status: z.enum(["borrador", "publicado"]),
  featured: z.boolean(),
  gallery: z.array(uuid).max(40),
});
export type ProjectInput = z.infer<typeof projectSchema>;

function parse(input: unknown): ProjectInput {
  const r = projectSchema.safeParse(input);
  if (!r.success) throw new ActionError(r.error.issues[0]?.message ?? "Datos no válidos");
  return { ...r.data, client_url: r.data.client_url === "https://" ? "" : r.data.client_url };
}

/** Crea (id = null) o guarda un proyecto con su galería. Devuelve el id. */
export async function saveProject(id: string | null, input: ProjectInput) {
  return action(async () => {
    await requireRole("staff");
    const { gallery, ...row } = parse(input);
    const supabase = await createSupabaseServer();
    let projectId: string;
    if (id) {
      projectId = uuid.parse(id);
      // Al editar un proyecto de ejemplo deja de serlo
      check(await supabase.from("projects").update({ ...row, is_placeholder: false }).eq("id", projectId).select("id").single());
    } else {
      const { data: last } = await supabase.from("projects").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
      const created = check(await supabase.from("projects").insert({ ...row, position: (last?.position ?? 0) + 10 }).select("id").single());
      projectId = created!.id;
    }
    // Galería: se reemplaza entera (orden = posición)
    check(await supabase.from("project_media").delete().eq("project_id", projectId));
    if (gallery.length) {
      check(await supabase.from("project_media").insert([...new Set(gallery)].map((media_id, i) => ({ project_id: projectId, media_id, position: i }))));
    }
    refresh();
    return { id: projectId };
  });
}

export async function setProjectFeatured(id: string, featured: boolean) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    check(await supabase.from("projects").update({ featured }).eq("id", uuid.parse(id)).select("id").single());
    refresh();
  });
}

export async function reorderProjects(ids: string[]) {
  return action(async () => {
    await requireRole("staff");
    const list = z.array(uuid).min(1).max(500).parse(ids);
    const supabase = await createSupabaseServer();
    for (const [i, id] of list.entries()) {
      check(await supabase.from("projects").update({ position: (i + 1) * 10 }).eq("id", id).select("id").single());
    }
    refresh();
  });
}

export async function deleteProject(id: string) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    check(await supabase.from("projects").delete().eq("id", uuid.parse(id)).select("id").single());
    refresh();
  });
}
