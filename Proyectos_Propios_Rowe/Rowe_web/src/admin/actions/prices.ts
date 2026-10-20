"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const key = z.string().regex(/^[a-z][a-z0-9_]*$/, "Las claves solo admiten minúsculas, números y _ (y empiezan por letra).").max(40);
const requirement = z.object({ set: key, in: z.array(key).min(1) }).nullable();
const int = z.number().int().min(-100000).max(100000);
const track = z.enum(["WE", "RO"]);

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  key,
  position: z.number().int(),
  visible: z.boolean(),
  take_label: z.string().trim().min(1, "Cada sección necesita su rótulo (Take).").max(40),
  title: z.string().trim().min(1, "Cada sección necesita un título.").max(120),
  description: z.string().max(400),
  requires: requirement,
  locked_title: z.string().max(120),
  locked_body: z.string().max(400),
  locked_cta: z.string().max(60),
  locked_select: z.string().max(40),
});

const optionSchema = z
  .object({
    id: z.string().uuid().optional(),
    section_key: key,
    key,
    position: z.number().int(),
    visible: z.boolean(),
    control: z.enum(["card", "segment", "toggle", "stepper"]),
    set_key: key.nullable(),
    set_label: z.string().max(80),
    set_description: z.string().max(300),
    badge: z.string().max(30),
    label: z.string().trim().min(1, "Cada opción necesita un nombre.").max(80),
    description: z.string().max(300),
    line_label: z.string().max(120),
    price_min: int,
    price_max: int,
    price_mode: z.enum(["once", "monthly", "percent_once"]),
    unit_label: z.string().max(20),
    track,
    is_base: z.boolean(),
    components: z.array(z.object({ label: z.string().trim().min(1).max(120), track, min: int, max: int, base: z.boolean().optional() })).max(6).nullable(),
    modifies_base: z.boolean(),
    base_suffix: z.string().max(60),
    weeks_min: z.number().int().min(-52).max(104),
    weeks_max: z.number().int().min(-52).max(104),
    weeks_factor: z.number().min(0.1).max(5).nullable(),
    stepper_min: z.number().int().min(0).max(100).nullable(),
    stepper_max: z.number().int().min(0).max(100).nullable(),
    stepper_included: z.number().int().min(0).max(100).nullable(),
    is_default: z.boolean(),
    requires: requirement,
  })
  .superRefine((o, ctx) => {
    const name = `«${o.label}»`;
    if (o.price_mode !== "percent_once" && Math.abs(o.price_min) > Math.abs(o.price_max)) ctx.addIssue({ code: "custom", message: `${name}: el mínimo no puede ser mayor que el máximo.` });
    if (o.weeks_min > o.weeks_max) ctx.addIssue({ code: "custom", message: `${name}: las semanas mínimas no pueden superar a las máximas.` });
    if ((o.control === "card" || o.control === "segment") && !o.set_key) ctx.addIssue({ code: "custom", message: `${name}: falta el grupo de elección única.` });
    if (o.control === "stepper") {
      if (o.stepper_min === null || o.stepper_max === null || o.stepper_min > o.stepper_max) ctx.addIssue({ code: "custom", message: `${name}: revisa el mínimo y el máximo del contador.` });
    }
    for (const c of o.components ?? []) {
      if (Math.abs(c.min) > Math.abs(c.max)) ctx.addIssue({ code: "custom", message: `${name} · «${c.label}»: el mínimo no puede ser mayor que el máximo.` });
    }
  });

const pricingSchema = z
  .object({
    sections: z.array(sectionSchema).min(1).max(30),
    options: z.array(optionSchema).max(200),
    deletedSections: z.array(z.string().uuid()).max(30),
    deletedOptions: z.array(z.string().uuid()).max(200),
  })
  .superRefine((p, ctx) => {
    const sectionKeys = new Set(p.sections.map((s) => s.key));
    if (sectionKeys.size !== p.sections.length) ctx.addIssue({ code: "custom", message: "Hay dos secciones con la misma clave." });
    const optionKeys = new Set(p.options.map((o) => o.key));
    if (optionKeys.size !== p.options.length) ctx.addIssue({ code: "custom", message: "Hay dos opciones con la misma clave." });
    for (const o of p.options) if (!sectionKeys.has(o.section_key)) ctx.addIssue({ code: "custom", message: `«${o.label}» está en una sección que no existe.` });
    if (!p.options.some((o) => o.is_base && o.visible)) ctx.addIssue({ code: "custom", message: "Debe haber al menos un tipo de proyecto (opción base) visible: sin él no hay presupuesto." });
    // Cada grupo de elección única: como mucho una opción por defecto
    const defaults = new Map<string, number>();
    for (const o of p.options) if (o.set_key && o.is_default) defaults.set(o.set_key, (defaults.get(o.set_key) ?? 0) + 1);
    for (const [set, n] of defaults) if (n > 1) ctx.addIssue({ code: "custom", message: `El grupo «${set}» tiene ${n} opciones marcadas por defecto; deja solo una.` });
  });

export type PricingInput = z.infer<typeof pricingSchema>;

const STRIP = ["updated_at", "updated_by"];
async function loadPricing(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const [{ data: sections }, { data: options }] = await Promise.all([
    supabase.from("config_sections").select("*").order("position"),
    supabase.from("config_options").select("*").order("position"),
  ]);
  const clean = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([k]) => !STRIP.includes(k)));
  return {
    sections: (sections ?? []).map(clean) as PricingInput["sections"],
    options: (options ?? []).map((o) => clean({ ...o, weeks_factor: o.weeks_factor === null ? null : Number(o.weeks_factor) })) as PricingInput["options"],
  };
}

/**
 * Guarda los precios y opciones del configurador en el BORRADOR. Solo administradores
 * (también lo exige la base de datos). Se valida todo antes de escribir nada.
 */
export async function savePricing(input: PricingInput) {
  return action(async () => {
    await requireRole("admin");
    const r = pricingSchema.safeParse(input);
    if (!r.success) throw new ActionError(r.error.issues[0]?.message ?? "Datos no válidos");
    const { sections, options, deletedSections, deletedOptions } = r.data;
    const supabase = await createSupabaseServer();

    // Solo se escribe lo que ha cambiado (menos esperas y un historial limpio)
    const [{ data: curS }, { data: curO }] = await Promise.all([supabase.from("config_sections").select("*"), supabase.from("config_options").select("*")]);
    const differs = (row: Record<string, unknown>, cur: Record<string, unknown> | undefined) =>
      !cur || Object.entries(row).some(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(k === "weeks_factor" && cur[k] !== null ? Number(cur[k]) : (cur[k] ?? null)));
    const byId = <T extends { id: string }>(rows: T[] | null) => new Map((rows ?? []).map((x) => [x.id, x as unknown as Record<string, unknown>]));
    const sMap = byId(curS as { id: string }[] | null);
    const oMap = byId(curO as { id: string }[] | null);

    if (deletedOptions.length) check(await supabase.from("config_options").delete().in("id", deletedOptions));
    for (const { id, ...s } of sections) {
      if (id && !differs(s, sMap.get(id))) continue;
      if (id) check(await supabase.from("config_sections").update(s).eq("id", id).select("id").single());
      else check(await supabase.from("config_sections").insert(s).select("id").single());
    }
    for (const { id, ...o } of options) {
      if (id && !differs(o, oMap.get(id))) continue;
      if (id) check(await supabase.from("config_options").update(o).eq("id", id).select("id").single());
      else check(await supabase.from("config_options").insert(o).select("id").single());
    }
    if (deletedSections.length) check(await supabase.from("config_sections").delete().in("id", deletedSections));
    refresh();
    // Devuelve lo guardado (con los ids de lo nuevo) para que el editor siga desde ahí
    return loadPricing(supabase);
  });
}
