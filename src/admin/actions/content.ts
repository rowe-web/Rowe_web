"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const jsonObject = z.record(z.string(), z.unknown());
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/.test(v), "El enlace debe empezar por /, #, https://, mailto: o tel:");

const sceneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kicker: z.string().max(120),
  title: z.string().max(200),
  body: z.string().max(2000),
  cta_label: z.string().max(80),
  cta_href: href,
  media_id: uuid.nullable(),
  poster_id: uuid.nullable(),
  data: jsonObject,
});
export type SceneInput = z.infer<typeof sceneSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ActionError(r.error.issues[0]?.message ?? "Datos no válidos");
  return r.data;
}

/** Guarda una escena en el BORRADOR (la web no cambia hasta publicar). */
export async function saveScene(id: string, input: SceneInput) {
  return action(async () => {
    await requireRole("staff");
    const data = parse(sceneSchema, input);
    const supabase = await createSupabaseServer();
    check(await supabase.from("scenes").update(data).eq("id", uuid.parse(id)).select("id").single());
    refresh();
  });
}

/** Nuevo orden de las escenas (lista de ids de arriba abajo). */
export async function reorderScenes(ids: string[]) {
  return action(async () => {
    await requireRole("staff");
    const list = parse(z.array(uuid).min(1).max(50), ids);
    const supabase = await createSupabaseServer();
    for (const [i, id] of list.entries()) {
      check(await supabase.from("scenes").update({ position: i * 10 }).eq("id", id).select("id").single());
    }
    refresh();
  });
}

export async function setSceneVisible(id: string, visible: boolean) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    check(await supabase.from("scenes").update({ visible }).eq("id", uuid.parse(id)).select("id").single());
    refresh();
  });
}

const email = z.string().trim().email();
/** Comprobaciones extra de algunos ajustes (el resto: cualquier JSON con la forma que ya tenía). */
const SETTING_RULES: Record<string, z.ZodType> = {
  notifications: z.object({ lead_recipients: z.array(email).min(1, "Pon al menos un email para recibir los avisos.").max(10) }).passthrough(),
  contact: z.object({ email_contact: email.or(z.literal("")), email_admin: email.or(z.literal("")), email_social: email.or(z.literal("")) }).partial().passthrough(),
  seo: z.object({ title: z.string().max(120), description: z.string().max(320) }).partial().passthrough(),
  legal: z.object({ email: email.or(z.literal("")) }).partial().passthrough(),
};

/** Ajuste por clave (contacto, SEO, marca, formulario…). RLS decide si un editor puede. */
export async function saveSetting(key: string, value: Record<string, unknown>) {
  return action(async () => {
    await requireRole("staff");
    const k = parse(z.string().regex(/^[a-z][a-z0-9_]*$/), key);
    const v = parse(jsonObject, value);
    if (SETTING_RULES[k]) {
      const r = SETTING_RULES[k].safeParse(v);
      if (!r.success) {
        const issue = r.error.issues[0];
        throw new ActionError(issue?.code === "invalid_format" || /email/i.test(issue?.message ?? "") ? `Revisa el email: «${String(issue?.path.reduce<unknown>((o, p) => (o as Record<string | number, unknown>)?.[p as string], v) ?? "")}» no es válido.` : (issue?.message ?? "Datos no válidos"));
      }
    }
    const supabase = await createSupabaseServer();
    const rows = check(await supabase.from("site_settings").update({ value: v }).eq("key", k).select("key"));
    if (!rows?.length) throw new ActionError("No tienes permiso para cambiar este ajuste.");
    refresh();
  });
}

const pageSchema = z.object({
  title: z.string().trim().min(1).max(160),
  intro: z.string().max(4000),
  blocks: z.array(z.unknown()).max(200),
  seo_title: z.string().max(120),
  seo_description: z.string().max(300),
  og_media_id: uuid.nullable(),
});

export async function savePage(id: string, input: z.infer<typeof pageSchema>) {
  return action(async () => {
    await requireRole("staff");
    const data = parse(pageSchema, input);
    const supabase = await createSupabaseServer();
    check(await supabase.from("pages").update(data).eq("id", uuid.parse(id)).select("id").single());
    refresh();
  });
}
