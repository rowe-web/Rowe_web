import type { Db } from "./client";
import { CONFIRMATION_EMAIL, CONTENT_TYPES, HERO_TEXT, HOME_SEO, SERVICE_AREA, WEB_TYPES } from "../../src/content/seed-data";
import { LEGAL_TEXT, LEGAL_TEXT_ORIGINAL, LEGAL_TEXT_PLACE } from "../../src/content/seed-pages";

/**
 * Actualizaciones de contenido posteriores a la carga inicial (equilibrio web / audiovisual).
 * Cada cambio solo se aplica si el campo sigue con el texto antiguo o no existe: lo editado
 * desde el panel nunca se pisa. Se puede ejecutar todas las veces que haga falta.
 */
type Obj = Record<string, unknown>;

const OLD_HABLEMOS = "¿Grabamos tu próxima *escena?*";

/** Textos originales del diseño que se sustituyen solo si nadie los ha cambiado. */
const OLD_HOME_SEO = {
  title: "ROWE — Estudio de web y audiovisual",
  description: "Webs a medida y vídeo para empresas y negocios que quieren verse profesionales en internet y conseguir más clientes.",
};
const OLD_HERO_BODY = "Estudio boutique de web y audiovisual para empresas y negocios que quieren verse profesionales en internet y conseguir más clientes.";
const NEW_HABLEMOS = "¿Empezamos tu próximo *proyecto?*";

/** Resumen de cada elemento del menú, por enlace (los demás quedan vacíos para rellenar en el panel). */
const MENU_SUMMARIES: Record<string, string> = {
  "/": "El showreel y el método ROWE de un vistazo: web, contenido y tráfico trabajando juntos.",
  "/web": "Webs a medida, rápidas y pensadas para convertir: diseño, desarrollo, SEO y mantenimiento.",
  "/audiovisual": "Guion, rodaje y edición: reels verticales, vídeo corporativo y fotografía para tu marca.",
  "/proyectos": "Trabajos recientes de web y audiovisual: el reto, la solución y lo que consiguieron.",
  "/#presupuesto": "Elige lo que necesitas y ve al momento un precio orientativo, sin compromiso.",
  "/#hablemos": "Cuéntanos tu idea por formulario, WhatsApp o email. Te respondemos en menos de 24 h.",
};

/** Cambia `obj[key]` de `from` a `to` solo si sigue valiendo `from`. */
function swap(obj: Obj, key: string, from: unknown, to: unknown): boolean {
  if (JSON.stringify(obj[key]) !== JSON.stringify(from)) return false;
  obj[key] = to;
  return true;
}

/** Añade `key` solo si no existe. */
function add(obj: Obj, key: string, value: unknown): boolean {
  if (key in obj) return false;
  obj[key] = value;
  return true;
}

async function updateJson(db: Db, table: string, col: string, where: string, id: string, fn: (v: Obj) => boolean): Promise<boolean> {
  const [row] = await db.query<{ v: Obj }>(`select ${col} as v from public.${table} where ${where} = $1`, [id]);
  if (!row?.v || typeof row.v !== "object") return false;
  const v = structuredClone(row.v);
  if (!fn(v)) return false;
  await db.query(`update public.${table} set ${col} = $2::text::jsonb where ${where} = $1`, [id, JSON.stringify(v)]);
  return true;
}

export async function applyContentUpdates(db: Db, log: (msg: string) => void): Promise<number> {
  let n = 0;
  const done = (ok: boolean, msg: string) => {
    if (ok) {
      n++;
      log(`✓ ${msg}`);
    }
  };

  // --- Configurador: «Solo contenido» -----------------------------------------
  const webReq = JSON.stringify({ set: "tipo", in: WEB_TYPES });
  done(
    (await db.query(`update public.config_sections set requires = $1::text::jsonb where key in ('tamano', 'funciones') and requires is null returning key`, [webReq])).length > 0,
    "Configurador: tamaño y funciones solo con web",
  );
  done(
    (
      await db.query(
        `update public.config_sections set locked_title = $1, locked_body = $2, locked_cta = $3, locked_select = 'contenido'
         where key = 'tamano' and locked_title = '' returning key`,
        [
          "Sin web, *de momento.*",
          "Este presupuesto es solo de contenido. Si también quieres la web, la hacemos con el mismo equipo y la misma estética.",
          "Añadir web",
        ],
      )
    ).length > 0,
    "Configurador: aviso «Sin web, de momento»",
  );
  done(
    (
      await db.query(`update public.config_sections set requires = $1::text::jsonb where key = 'audiovisual' and requires = '{"set":"tipo","in":["contenido"]}'::jsonb returning key`, [
        JSON.stringify({ set: "tipo", in: CONTENT_TYPES }),
      ])
    ).length > 0,
    "Configurador: el bloque audiovisual se abre también con «Solo contenido»",
  );
  done(
    (await db.query(`update public.config_options set requires = $1::text::jsonb where key = 'mant' and requires is null returning key`, [webReq])).length > 0,
    "Configurador: mantenimiento solo con web",
  );
  done(
    await updateJson(db, "site_settings", "value", "key", "configurator", (v) => {
      const a = add(v, "includes_content", "Guion · Rodaje vertical 9:16 · Edición y color · Subtítulos · Música con licencia");
      const b = add(v, "add_web_hint", "Añade web");
      return a || b;
    }),
    "Configurador: textos de «Solo contenido»",
  );

  // --- Hablemos: titular mixto -------------------------------------------------
  done(
    await updateJson(db, "site_settings", "value", "key", "hablemos", (v) => swap(v, "title", OLD_HABLEMOS, NEW_HABLEMOS)),
    "Hablemos: «¿Empezamos tu próximo proyecto?»",
  );
  done(
    (await db.query(`update public.scenes set title = $2 where key = 'hablemos' and title = $1 returning key`, [OLD_HABLEMOS, NEW_HABLEMOS])).length > 0,
    "Escena 10: titular mixto",
  );
  done(
    await updateJson(db, "site_settings", "value", "key", "hablemos", (v) => {
      const fields = v.fields as Obj | undefined;
      if (!fields || typeof fields !== "object") return false;
      const a = add(fields, "city", "Ubicación / Ciudad *") || swap(fields, "city", "Ubicación / Ciudad", "Ubicación / Ciudad *");
      const b = add(fields, "city_placeholder", "Ej. Madrid, Barcelona...") || swap(fields, "city_placeholder", "ej. Madrid, Barcelona...", "Ej. Madrid, Barcelona...");
      const errors = v.errors as Obj | undefined;
      const c = !!errors && typeof errors === "object" && add(errors, "city", "Indícanos tu ciudad para valorar el desplazamiento.");
      return a || b || c;
    }),
    "Hablemos: campo «Ubicación / Ciudad *» (obligatorio)",
  );
  done(
    await updateJson(db, "site_settings", "value", "key", "navigation", (v) => {
      let changed = swap(v, "footer_title", OLD_HABLEMOS, NEW_HABLEMOS);
      for (const it of (Array.isArray(v.items) ? v.items : []) as Obj[]) {
        changed = swap(it, "caption", "Fig. 05 — ¿Grabamos tu próxima escena?", "Fig. 05 — ¿Empezamos tu próximo proyecto?") || changed;
      }
      changed = add(v, "preloader_steps", ["npm run build", "render · 2.39:1 · 25 fps", "deploy → producción"]) || changed;
      return changed;
    }),
    "Menú, pie y preloader: textos mixtos web / audiovisual",
  );

  // --- Menú: resumen de cada sección al pasar por encima --------------------------
  done(
    await updateJson(db, "site_settings", "value", "key", "navigation", (v) => {
      let changed = false;
      for (const it of (Array.isArray(v.items) ? v.items : []) as Obj[]) {
        changed = add(it, "summary", MENU_SUMMARIES[String(it.href)] ?? "") || changed;
      }
      return changed;
    }),
    "Menú: resumen de cada sección",
  );

  // --- Contacto: dónde trabajamos ------------------------------------------------
  done(
    await updateJson(db, "site_settings", "value", "key", "contact", (v) => {
      let changed = false;
      for (const [k, val] of Object.entries(SERVICE_AREA)) changed = add(v, k, val) || changed;
      return changed;
    }),
    "Contacto: «Dónde trabajamos» (webs online, rodajes en el Camp de Tarragona)",
  );

  // --- Hero: frase de posicionamiento y SEO de la home ----------------------------
  done(
    await updateJson(db, "scenes", "data", "key", "hero", (v) => add(v, "claim", HERO_TEXT.claim)),
    "Hero: frase de posicionamiento",
  );
  done(
    (await db.query(`update public.scenes set body = $2 where key = 'hero' and body = $1 returning key`, [OLD_HERO_BODY, HERO_TEXT.body])).length > 0,
    "Hero: texto más corto (sin repetir la frase)",
  );
  done(
    await updateJson(db, "site_settings", "value", "key", "seo", (v) => {
      const a = swap(v, "title", OLD_HOME_SEO.title, HOME_SEO.title);
      const b = swap(v, "description", OLD_HOME_SEO.description, HOME_SEO.description);
      return a || b;
    }),
    "SEO de la home: qué hacemos y dónde",
  );

  // --- Email de confirmación al cliente (la fila la crea el seed; aquí, los campos que falten) ---
  done(
    await updateJson(db, "site_settings", "value", "key", "confirmation_email", (v) => {
      let changed = false;
      for (const [k, val] of Object.entries(CONFIRMATION_EMAIL)) changed = add(v, k, val) || changed;
      return changed;
    }),
    "Email de confirmación: textos que faltaban",
  );

  // --- Textos legales adaptados a ROWE (solo donde sigue el texto original) -------
  for (const [key, place] of Object.entries(LEGAL_TEXT_PLACE) as [keyof typeof LEGAL_TEXT, { slug: string; title: string }][]) {
    const [row] = await db.query<{ blocks: Obj[] }>("select blocks from public.pages where slug = $1", [place.slug]);
    if (!Array.isArray(row?.blocks)) continue;
    let changed = false;
    const blocks = row.blocks.map((b) => {
      if (b.title !== place.title || b.body !== LEGAL_TEXT_ORIGINAL[key]) return b;
      changed = true;
      return { ...b, body: LEGAL_TEXT[key] };
    });
    if (changed) await db.query("update public.pages set blocks = $2::text::jsonb where slug = $1", [place.slug, JSON.stringify(blocks)]);
    done(changed, `/${place.slug}: «${place.title}» adaptado a ROWE`);
  }

  // --- Título de la pestaña al salir --------------------------------------------
  done(
    await updateJson(db, "site_settings", "value", "key", "brand", (v) =>
      ["● REC en pausa — vuelve pronto", "● ROWE en pausa — vuelve pronto"].some((old) => swap(v, "tab_away_title", old, "ROWE en pausa — vuelve pronto")),
    ),
    "Pestaña en segundo plano: «ROWE en pausa»",
  );

  // --- Hero: Fig. 01 pasa a ser el vídeo del proceso -----------------------------
  done(
    await updateJson(db, "scenes", "data", "key", "hero", (v) => {
      const a = swap(v, "photo_caption", "Fig. 01 — Rodaje en clínica", "Fig. 01 — Proceso ROWE · web, contenido y tráfico");
      const b = add(v, "process_video_media_id", null);
      const c = add(v, "process_steps", [
        { key: "WE", label: "Web" },
        { key: "RO", label: "Contenido" },
        { key: "↗", label: "Tráfico" },
      ]);
      return a || b || c;
    }),
    "Hero: Fig. 01 «Proceso ROWE»",
  );

  // --- Escena 03: vista escritorio / móvil -------------------------------------
  done(
    await updateJson(db, "scenes", "data", "key", "web", (v) => {
      const a = swap(v, "screen_caption", "Fig. 03 — Web en movimiento · sustituir", "Fig. 03 — Web en movimiento");
      const b = add(v, "view_desktop", "Escritorio");
      const c = add(v, "view_mobile", "Móvil");
      const d = add(v, "mobile_media_id", null);
      return a || b || c || d;
    }),
    "Escena 03: selector escritorio / móvil",
  );

  // --- Pies de foto de las cabeceras sin «· sustituir» --------------------------
  for (const slug of ["web", "audiovisual"]) {
    const [row] = await db.query<{ blocks: Obj[] }>("select blocks from public.pages where slug = $1", [slug]);
    if (!Array.isArray(row?.blocks)) continue;
    let changed = false;
    const blocks = row.blocks.map((b) => {
      if (b.type === "cabecera" && typeof b.caption === "string" && b.caption.endsWith(" · sustituir")) {
        changed = true;
        return { ...b, caption: b.caption.slice(0, -" · sustituir".length) };
      }
      return b;
    });
    if (changed) await db.query("update public.pages set blocks = $2::text::jsonb where slug = $1", [slug, JSON.stringify(blocks)]);
    done(changed, `Página /${slug}: pie de la cabecera sin «sustituir»`);
  }

  return n;
}
