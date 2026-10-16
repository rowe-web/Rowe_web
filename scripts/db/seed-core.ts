import type { Db } from "./client";
import * as data from "../../src/content/seed-data";
import { legacyPageText } from "../../src/content/seed-pages";

export interface SeedOptions {
  /** Borra y vuelve a cargar todo el contenido editable (NO toca leads, usuarios ni medios). */
  resetContent?: boolean;
  /** Añade los mensajes de ejemplo del diseño a la bandeja. */
  demo?: boolean;
  log?: (msg: string) => void;
}

const j = (v: unknown) => JSON.stringify(v ?? null);

/**
 * Carga el contenido inicial. Es idempotente: solo inserta lo que falta, así que
 * volver a ejecutarlo nunca pisa lo editado desde el panel (salvo con resetContent).
 */
export async function seedContent(db: Db, opts: SeedOptions = {}): Promise<{ published: number | null }> {
  const log = opts.log ?? console.log;

  if (opts.resetContent) {
    log("⚠ Reiniciando el contenido editable (escenas, textos, proyectos, precios, ajustes)…");
    await db.exec(`
      delete from public.project_media;
      delete from public.projects;
      delete from public.scenes;
      delete from public.services;
      delete from public.pages;
      delete from public.config_options;
      delete from public.config_sections;
      delete from public.site_settings;
    `);
  }

  for (const s of data.settings) {
    await db.query(
      `insert into public.site_settings (key, label, value, is_public, editor_can_edit)
       values ($1, $2, $3::text::jsonb, $4, $5) on conflict (key) do nothing`,
      [s.key, s.label, j(s.value), s.isPublic, s.editorCanEdit],
    );
  }

  for (const [i, s] of data.scenes.entries()) {
    await db.query(
      `insert into public.scenes (key, position, visible, name, kicker, title, body, cta_label, cta_href, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text::jsonb) on conflict (key) do nothing`,
      [s.key, i * 10, s.visible ?? true, s.name, s.kicker, s.title, s.body, s.ctaLabel, s.ctaHref, j(s.data)],
    );
  }

  for (const [i, s] of data.services.entries()) {
    await db.query(
      `insert into public.services (discipline, slug, position, title, description)
       values ($1, $2, $3, $4, $5) on conflict (slug) do nothing`,
      [s.discipline, s.slug, i * 10, s.title, s.description],
    );
  }

  for (const p of data.pages) {
    await db.query(
      `insert into public.pages (slug, kind, title, intro, blocks, seo_title, seo_description)
       values ($1, $2, $3, $4, $5::text::jsonb, $6, $7) on conflict (slug) do nothing`,
      [p.slug, p.kind, p.title, p.intro, j(p.blocks), p.seoTitle, p.seoDescription],
    );
    // Actualización de contenido (Fase 5): solo rellena las páginas que siguen sin secciones
    // y con la entradilla provisional. Lo editado desde el panel nunca se pisa.
    const filled = await db.query(
      `update public.pages set blocks = $4::text::jsonb,
         title = case when title = any($7::text[]) then $2 else title end,
         intro = case when intro = any($8::text[]) then $3 else intro end,
         seo_title = case when seo_title = '' then $5 else seo_title end,
         seo_description = case when seo_description = '' then $6 else seo_description end
       where slug = $1 and blocks = '[]'::jsonb
       returning slug`,
      [p.slug, p.title, p.intro, j(p.blocks), p.seoTitle, p.seoDescription, legacyPageText.titles, legacyPageText.intros],
    );
    if (filled.length) log(`✓ Página /${p.slug}: contenido de la Fase 5`);
  }

  for (const [i, p] of data.projects.entries()) {
    await db.query(
      `insert into public.projects (slug, title, client, sector, year, category, summary, challenge, solution, result,
         metrics, seo_title, seo_description, status, featured, is_placeholder, position)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text::jsonb, $12, $13, $14::public.content_status, $15, true, $16)
       on conflict (slug) do nothing`,
      [p.slug, p.title, p.client, p.sector, p.year, p.category, p.summary, p.challenge, p.solution, p.result,
        j(p.metrics), `${p.title} — Caso de estudio · ROWE`, p.summary, p.status, p.featured, i * 10],
    );
  }

  for (const [i, s] of data.configSections.entries()) {
    await db.query(
      `insert into public.config_sections (key, position, take_label, title, description, requires,
         locked_title, locked_body, locked_cta, locked_select)
       values ($1, $2, $3, $4, $5, $6::text::jsonb, $7, $8, $9, $10) on conflict (key) do nothing`,
      [s.key, i * 10, s.takeLabel, s.title, s.description ?? "", s.requires ? j(s.requires) : null,
        s.lockedTitle ?? "", s.lockedBody ?? "", s.lockedCta ?? "", s.lockedSelect ?? ""],
    );
  }

  for (const [i, o] of data.configOptions.entries()) {
    await db.query(
      `insert into public.config_options (section_key, key, position, control, set_key, set_label, set_description, badge,
         label, description, line_label, price_min, price_max, price_mode, unit_label, track, is_base, components,
         modifies_base, base_suffix, weeks_min, weeks_max, weeks_factor, stepper_min, stepper_max, stepper_included, is_default)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::public.price_mode, $15, $16, $17, $18::text::jsonb,
         $19, $20, $21, $22, $23, $24, $25, $26, $27)
       on conflict (key) do nothing`,
      [o.section, o.key, i * 10, o.control, o.setKey ?? null, o.setLabel ?? "", o.setDescription ?? "", o.badge ?? "",
        o.label, o.description ?? "", o.lineLabel ?? "", o.priceMin, o.priceMax, o.priceMode ?? "once", o.unitLabel ?? "",
        o.track ?? "WE", o.isBase ?? false, o.components ? j(o.components) : null, o.modifiesBase ?? false, o.baseSuffix ?? "",
        o.weeksMin ?? 0, o.weeksMax ?? 0, o.weeksFactor ?? null, o.stepper?.min ?? null, o.stepper?.max ?? null,
        o.stepper?.included ?? null, o.isDefault ?? false],
    );
  }

  if (opts.demo) {
    for (const l of data.demoLeads) {
      await db.query(
        `insert into public.leads (created_at, origin, need, sector, budget_label, message, name, company, email, phone,
           privacy_accepted_at, status, source)
         select now() - make_interval(hours => $1), $2::public.lead_origin, $3, $4, $5, $6, $7, $8, $9, $10,
           now() - make_interval(hours => $1), $11::public.lead_status, $12::text::jsonb
         where not exists (select 1 from public.leads where email = $9)`,
        [l.hoursAgo, l.origin, l.need, l.sector, l.budgetLabel, l.message, l.name, l.company, l.email, l.phone, l.status,
          j({ demo: true, items: l.items })],
      );
    }
    log(`✓ ${data.demoLeads.length} mensajes de ejemplo`);
  }

  // Primera publicación (o republicación tras reiniciar el contenido)
  const [{ count }] = await db.query<{ count: number }>("select count(*)::int as count from public.releases");
  let published: number | null = null;
  if (count === 0 || opts.resetContent) {
    const [row] = await db.query<{ v: number }>("select public.publish_release($1) as v", [
      opts.resetContent ? "Contenido inicial (reiniciado)" : "Contenido inicial",
    ]);
    published = row.v;
    log(`✓ Publicada la versión ${published}`);
  }
  log("✓ Contenido inicial cargado");
  return { published };
}
