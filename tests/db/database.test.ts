import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../../scripts/db/migrate-core";
import { seedContent } from "../../scripts/db/seed-core";
import * as data from "../../src/content/seed-data";
import { createTestDb, type TestDb } from "./pglite";

let db: TestDb;
let adminId: string;
let editorId: string;
let noRoleId: string;

type Snapshot = {
  version: number;
  settings: Record<string, unknown>;
  scenes: { key: string; title: string }[];
  projects: { slug: string }[];
  configurator: { sections: unknown[]; options: { key: string; price_min: number; price_max: number }[] };
};

const latest = async () =>
  (await db.query<{ s: Snapshot }>("select snapshot as s from public.releases order by version desc limit 1"))[0].s;

beforeAll(async () => {
  db = await createTestDb();
  adminId = await db.createUser("rowe.web.agency@gmail.com", "admin", "Admin ROWE");
  editorId = await db.createUser("rowe.web.redes@gmail.com", "editor", "Redes ROWE");
  noRoleId = await db.createUser("intruso@example.com", null);
  await seedContent(db, { demo: true, log: () => {} });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("migraciones", () => {
  it("son idempotentes (volver a ejecutarlas no aplica nada)", async () => {
    const res = await runMigrations(db, undefined, () => {});
    expect(res.applied).toEqual([]);
    expect(res.skipped.length).toBeGreaterThanOrEqual(3);
  });

  it("crean el perfil al dar de alta un usuario, con el rol de app_metadata", async () => {
    const rows = await db.query<{ email: string; role: string | null }>("select email, role from public.profiles order by email");
    expect(rows).toEqual([
      { email: "intruso@example.com", role: null },
      { email: "rowe.web.agency@gmail.com", role: "admin" },
      { email: "rowe.web.redes@gmail.com", role: "editor" },
    ]);
  });
});

describe("seed y publicación inicial", () => {
  it("carga todo el contenido del diseño", async () => {
    const [c] = await db.query<Record<string, number>>(`select
      (select count(*)::int from public.scenes) as scenes,
      (select count(*)::int from public.config_sections) as sections,
      (select count(*)::int from public.config_options) as options,
      (select count(*)::int from public.projects) as projects,
      (select count(*)::int from public.leads) as leads`);
    expect(c).toEqual({
      scenes: data.scenes.length,
      sections: data.configSections.length,
      options: data.configOptions.length,
      projects: data.projects.length,
      leads: data.demoLeads.length,
    });
  });

  it("es idempotente y no pisa lo editado", async () => {
    await db.query("update public.scenes set title = 'Editado' where key = 'hero'");
    await seedContent(db, { demo: true, log: () => {} });
    const [hero] = await db.query<{ title: string }>("select title from public.scenes where key = 'hero'");
    expect(hero.title).toBe("Editado");
    const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from public.leads");
    expect(n).toBe(data.demoLeads.length);
    await db.query("update public.scenes set title = $1 where key = 'hero'", [data.scenes[0].title]);
  });

  it("publica la versión 1 solo con lo público", async () => {
    const snap = (await db.query<{ s: Snapshot }>("select snapshot as s from public.releases where version = 1"))[0].s;
    expect(snap.version).toBe(1);
    expect(snap.scenes.map((s) => s.key)).toEqual(data.scenes.map((s) => s.key));
    expect(snap.projects.map((p) => p.slug)).not.toContain("logistica-vela"); // borrador
    expect(snap.projects).toHaveLength(5);
    expect(Object.keys(snap.settings)).not.toContain("notifications"); // ajuste interno
    expect(snap.configurator.options).toHaveLength(data.configOptions.length);
    expect(JSON.stringify(snap)).not.toContain("is_placeholder");
  });
});

describe("seguridad · público (anon)", () => {
  it("lee la versión publicada", async () => {
    const rows = await db.as(null, () => db.query<{ v: number }>("select version as v from public.releases"));
    expect(rows.length).toBeGreaterThan(0);
    const [r] = await db.as(null, () => db.query<{ s: Snapshot }>("select public.latest_release() as s"));
    expect(r.s.version).toBeGreaterThan(0);
  });

  it.each(["scenes", "leads", "config_options", "profiles", "site_settings", "audit_log", "quotes", "events", "media"])(
    "no puede leer %s",
    async (table) => {
      await expect(db.as(null, () => db.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    },
  );

  it("no puede crear leads directamente ni publicar", async () => {
    await expect(
      db.as(null, () =>
        db.query(`insert into public.leads (origin, need, name, email, privacy_accepted_at) values ('formulario', 'Web', 'X', 'x@x.es', now())`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as(null, () => db.query("select public.publish_release('hack')"))).rejects.toThrow(/permission denied/);
    await expect(db.as(null, () => db.query("select public.check_rate_limit('k', 1, 60)"))).rejects.toThrow(/permission denied/);
  });

  it("no puede leer el esquema interno", async () => {
    await expect(db.as(null, () => db.query("select * from internal.rate_limits"))).rejects.toThrow(/permission denied/);
  });
});

describe("seguridad · usuario sin rol", () => {
  it("no ve nada del panel", async () => {
    const leads = await db.as(noRoleId, () => db.query("select * from public.leads"));
    const scenes = await db.as(noRoleId, () => db.query("select * from public.scenes"));
    expect(leads).toHaveLength(0);
    expect(scenes).toHaveLength(0);
  });

  it("no puede darse rol a sí mismo", async () => {
    await expect(
      db.as(noRoleId, () => db.query("update public.profiles set role = 'admin' where id = $1", [noRoleId])),
    ).rejects.toThrow(/Solo un administrador/);
  });
});

describe("seguridad · editor", () => {
  it("edita escenas y queda registrado en el historial con su nombre", async () => {
    await db.as(editorId, () => db.query("update public.scenes set title = 'Nuevo titular' where key = 'hero'"));
    const [log] = await db.query<{ actor_name: string; category: string; summary: string; before: { title: string } }>(
      "select actor_name, category, summary, before from public.audit_log where table_name = 'scenes' order by id desc limit 1",
    );
    expect(log.actor_name).toBe("Redes ROWE");
    expect(log.category).toBe("Textos");
    expect(log.summary).toBe("Editó «Hero»");
    expect(log.before.title).toBe(data.scenes[0].title);
  });

  it("el borrador no cambia la web pública hasta publicar", async () => {
    const snap = await latest();
    expect(snap.scenes.find((s) => s.key === "hero")?.title).toBe(data.scenes[0].title);
  });

  it("no ve ni toca los precios", async () => {
    const rows = await db.as(editorId, () => db.query("select * from public.config_options"));
    expect(rows).toHaveLength(0);
    const updated = await db.as(editorId, () =>
      db.query("update public.config_options set price_min = 1 where key = 'tienda' returning key"),
    );
    expect(updated).toHaveLength(0);
  });

  it("no puede publicar", async () => {
    await expect(db.as(editorId, () => db.query("select public.publish_release('x')"))).rejects.toThrow(/Solo un administrador puede publicar/);
  });

  it("no puede cambiar ajustes críticos, sí los marcados como editables", async () => {
    const contact = await db.as(editorId, () =>
      db.query("update public.site_settings set value = '{}'::jsonb where key = 'contact' returning key"),
    );
    expect(contact).toHaveLength(0);
    const brand = await db.as(editorId, () =>
      db.query("update public.site_settings set label = 'Marca' where key = 'brand' returning key"),
    );
    expect(brand).toHaveLength(1);
    await expect(
      db.as(editorId, () => db.query("update public.site_settings set is_public = false where key = 'brand'")),
    ).rejects.toThrow(/Solo un administrador/);
  });

  it("gestiona mensajes pero no los borra", async () => {
    const leads = await db.as(editorId, () => db.query<{ id: string }>("select id from public.leads"));
    expect(leads.length).toBe(data.demoLeads.length);
    const upd = await db.as(editorId, () =>
      db.query("update public.leads set status = 'contactado', notes = 'Llamar el lunes' where id = $1 returning id", [leads[0].id]),
    );
    expect(upd).toHaveLength(1);
    const del = await db.as(editorId, () => db.query("delete from public.leads where id = $1 returning id", [leads[0].id]));
    expect(del).toHaveLength(0);
  });

  it("no puede cambiar su propio rol", async () => {
    await expect(
      db.as(editorId, () => db.query("update public.profiles set role = 'admin' where id = $1", [editorId])),
    ).rejects.toThrow(/Solo un administrador/);
  });
});

describe("administrador", () => {
  it("cambia un precio, publica y la web lo ve; luego restaura la versión anterior", async () => {
    const before = await latest();
    await db.as(adminId, () => db.query("update public.config_options set price_min = 1000, price_max = 1600 where key = 'tienda'"));
    const [{ v }] = await db.as(adminId, () => db.query<{ v: number }>("select public.publish_release('Nuevo precio tienda') as v"));
    expect(v).toBe(before.version + 1);
    const after = await latest();
    expect(after.configurator.options.find((o) => o.key === "tienda")).toMatchObject({ price_min: 1000, price_max: 1600 });
    // La escena editada por el editor también entra al publicar
    expect(after.scenes.find((s) => s.key === "hero")?.title).toBe("Nuevo titular");

    const [{ r }] = await db.as(adminId, () => db.query<{ r: number }>("select public.republish_release($1) as r", [before.version]));
    const restored = await latest();
    expect(restored.version).toBe(r);
    expect(restored.configurator.options.find((o) => o.key === "tienda")).toMatchObject({ price_min: 900, price_max: 1500 });

    const [log] = await db.query<{ action: string; actor_name: string }>(
      "select action, actor_name from public.audit_log where table_name = 'releases' order by id desc limit 1",
    );
    expect(log).toEqual({ action: "restore", actor_name: "Admin ROWE" });
  });

  it("rechaza precios incoherentes (mínimo mayor que máximo)", async () => {
    await expect(
      db.as(adminId, () => db.query("update public.config_options set price_min = 900, price_max = 100 where key = 'seo'")),
    ).rejects.toThrow(/config_price_range/);
  });

  it("puede cambiar roles, pero nunca dejar la web sin administrador", async () => {
    await db.as(adminId, () => db.query("update public.profiles set role = 'editor' where id = $1", [noRoleId]));
    await expect(
      db.as(adminId, () => db.query("update public.profiles set role = 'editor' where id = $1", [adminId])),
    ).rejects.toThrow(/al menos un administrador/);
  });
});

describe("panel: estado de publicación, estadísticas y usuarios", () => {
  it("detecta cambios sin publicar y deja de hacerlo al publicar", async () => {
    type Status = { dirty: boolean; version: number; last_change: string };
    const st = async () => (await db.as(adminId, () => db.query<{ s: Status }>("select public.draft_status() as s")))[0].s;
    await db.as(adminId, () => db.query("select public.publish_release('limpio')"));
    expect((await st()).dirty).toBe(false);
    await db.as(editorId, () => db.query("update public.scenes set body = 'Borrador' where key = 'servicios'"));
    const s = await st();
    expect(s.dirty).toBe(true);
    expect(s.last_change).toBe("Editó «Servicios»");
    await db.as(adminId, () => db.query("select public.publish_release('ok')"));
    expect((await st()).dirty).toBe(false);
  });

  it("estadísticas del periodo con embudo y origen", async () => {
    await db.exec(`
      insert into public.events (type, path, referrer_source, session_hash, created_at) values
        ('pageview', '/', 'Instagram', 's1', now() - interval '2 hours'),
        ('pageview', '/web', 'Interno', 's1', now() - interval '1 hour'),
        ('config_open', '/', 'Interno', 's1', now() - interval '1 hour'),
        ('lead', '/', 'Interno', 's1', now() - interval '50 minutes'),
        ('pageview', '/', 'Google', 's2', now() - interval '1 day'),
        ('video_play', '/', 'Google', 's2', now() - interval '1 day'),
        ('pageview', '/', 'Directo', 's3', now() - interval '10 days');`);
    const [{ s }] = await db.as(editorId, () => db.query<{ s: Record<string, unknown> }>("select public.admin_stats(7) as s"));
    expect(s).toMatchObject({ visits: 3, uniques: 2, visits_prev: 1, lead_sessions: 1, unit: "day" });
    expect(s.funnel).toEqual({ visits: 2, video: 1, config: 1, lead: 1 });
    expect((s.sources as { label: string }[]).map((x) => x.label).sort()).toEqual(["Google", "Instagram"]);
    expect((s.bars as unknown[]).length).toBe(8);
    expect(s.avg_seconds).toBe(2100); // media de s1 (1 h 10 min) y s2 (dos eventos en el mismo instante: 0 s)
    await expect(db.as(null, () => db.query("select public.admin_stats(7)"))).rejects.toThrow(/permission denied/);
  });

  it("lista de usuarios solo para administradores", async () => {
    const rows = await db.as(adminId, () => db.query<{ email: string; role: string }>("select * from public.admin_users()"));
    expect(rows.map((r) => r.email)).toContain("rowe.web.agency@gmail.com");
    await expect(db.as(editorId, () => db.query("select * from public.admin_users()"))).rejects.toThrow(/Solo un administrador/);
  });
});

describe("historial: restaurar cambios", () => {
  const lastLog = async (table: string) =>
    (await db.query<{ id: number; action: string; summary: string }>("select id, action, summary from public.audit_log where table_name = $1 order by id desc limit 1", [table]))[0];

  it("deshace una edición y queda como «Restauró»", async () => {
    await db.as(editorId, () => db.query("update public.scenes set title = 'Titular temporal' where key = 'estudio'"));
    const edit = await lastLog("scenes");
    await db.as(editorId, () => db.query("select public.restore_change($1)", [edit.id]));
    const [{ title }] = await db.query<{ title: string }>("select title from public.scenes where key = 'estudio'");
    expect(title).toBe(data.scenes.find((x) => x.key === "estudio")!.title);
    const log = await lastLog("scenes");
    expect(log.action).toBe("restore");
    expect(log.summary).toMatch(/^Restauró/);
  });

  it("recrea lo borrado y elimina lo creado", async () => {
    const [p] = await db.as(editorId, () =>
      db.query<{ id: string }>("insert into public.projects (slug, title) values ('temporal', 'Temporal') returning id"),
    );
    const created = await lastLog("projects");
    await db.as(editorId, () => db.query("delete from public.projects where id = $1", [p.id]));
    const deleted = await lastLog("projects");
    await db.as(editorId, () => db.query("select public.restore_change($1)", [deleted.id]));
    expect(await db.query("select 1 from public.projects where id = $1", [p.id])).toHaveLength(1);
    await db.as(editorId, () => db.query("select public.restore_change($1)", [created.id]));
    expect(await db.query("select 1 from public.projects where id = $1", [p.id])).toHaveLength(0);
  });

  it("respeta los permisos: un editor no restaura precios", async () => {
    await db.as(adminId, () => db.query("update public.config_options set price_max = price_max + 10 where key = 'seo'"));
    const change = await lastLog("config_options");
    await expect(db.as(editorId, () => db.query("select public.restore_change($1)", [change.id]))).rejects.toThrow(/ya no existe|permission|Sin permiso/);
    await db.as(adminId, () => db.query("select public.restore_change($1)", [change.id]));
    const [{ price_max }] = await db.query<{ price_max: number }>("select price_max from public.config_options where key = 'seo'");
    expect(price_max).toBe(data.configOptions.find((o) => o.key === "seo")!.priceMax);
  });

  it("nadie sin rol puede usarlo", async () => {
    const change = await lastLog("scenes");
    const outsider = await db.createUser("sin-rol@example.com", null);
    await expect(db.as(outsider, () => db.query("select public.restore_change($1)", [change.id]))).rejects.toThrow(/Sin permiso/);
  });
});

describe("páginas internas y direcciones de proyectos (Fase 5)", () => {
  it("el público obtiene los slugs de los proyectos publicados (para el 404 del proxy)", async () => {
    const [{ slugs }] = await db.as(null, () => db.query<{ slugs: string[] }>("select public.published_project_slugs() as slugs"));
    const snap = await latest();
    expect([...slugs].sort()).toEqual(snap.projects.map((p) => p.slug).sort());
    expect(slugs).not.toContain("logistica-vela"); // en borrador
  });

  it("las páginas llegan con sus secciones y los textos legales con sus apartados", async () => {
    const rows = await db.query<{ slug: string; kind: string; n: number }>("select slug, kind, jsonb_array_length(blocks) as n from public.pages order by slug");
    expect(rows.every((r) => r.n > 0)).toBe(true);
    const [legal] = await db.query<{ blocks: { title: string }[] }>("select blocks from public.pages where slug = 'privacidad'");
    expect(legal.blocks[0].title).toBe("Responsable del tratamiento");
  });

  it("la actualización de contenido rellena páginas vacías sin pisar lo editado", async () => {
    await db.query("update public.pages set blocks = '[]'::jsonb, intro = '[Texto legal pendiente de completar]' where slug = 'cookies'");
    await db.query("update public.pages set blocks = '[]'::jsonb, intro = 'Mi entradilla editada', title = 'Mi título' where slug = 'web'");
    await db.query("update public.pages set title = 'Contacto editado' where slug = 'contacto'");
    await seedContent(db, { log: () => {} });
    const pages = Object.fromEntries(
      (await db.query<{ slug: string; title: string; intro: string; n: number }>("select slug, title, intro, jsonb_array_length(blocks) as n from public.pages")).map((r) => [r.slug, r]),
    );
    expect(pages.cookies.n).toBeGreaterThan(0);
    expect(pages.cookies.intro).not.toMatch(/pendiente/);
    expect(pages.web.n).toBeGreaterThan(0);
    expect(pages.web.intro).toBe("Mi entradilla editada");
    expect(pages.web.title).toBe("Mi título");
    expect(pages.contacto.title).toBe("Contacto editado");
  });

  it("equilibrio web / audiovisual: cambia los textos antiguos, añade «Solo contenido» y respeta lo editado", async () => {
    // Estado de una base cargada antes del cambio
    await db.exec(`
      delete from public.config_options where key = 'redes';
      update public.config_sections set requires = null, locked_title = '' where key in ('tamano', 'funciones');
      update public.config_sections set requires = '{"set":"tipo","in":["contenido"]}' where key = 'audiovisual';
      update public.config_options set requires = null where key = 'mant';
      update public.site_settings set value = jsonb_set(value, '{title}', '"¿Grabamos tu próxima *escena?*"') where key = 'hablemos';
      update public.site_settings set value = (value - 'preloader_steps') || '{"footer_title":"Mi pie editado"}' where key = 'navigation';
      update public.scenes set data = (data - 'process_steps') || '{"photo_caption":"Fig. 01 — Rodaje en clínica"}' where key = 'hero';
      update public.scenes set data = data || '{"screen_caption":"Mi pie del visor"}' where key = 'web';
    `);
    await seedContent(db, { log: () => {} });
    const [redes] = await db.query<{ track: string; is_base: boolean }>("select track, is_base from public.config_options where key = 'redes'");
    expect(redes).toEqual({ track: "RO", is_base: true });
    const secs = Object.fromEntries((await db.query<{ key: string; requires: { in: string[] } | null; locked_title: string }>("select key, requires, locked_title from public.config_sections")).map((r) => [r.key, r]));
    expect(secs.tamano.requires?.in).not.toContain("redes");
    expect(secs.tamano.locked_title).toMatch(/Sin web/);
    expect(secs.funciones.requires?.in).toContain("nueva");
    expect(secs.audiovisual.requires?.in).toEqual(["contenido", "redes"]);
    const [mant] = await db.query<{ requires: { in: string[] } }>("select requires from public.config_options where key = 'mant'");
    expect(mant.requires.in).not.toContain("redes");
    const settings = Object.fromEntries((await db.query<{ key: string; value: Record<string, unknown> }>("select key, value from public.site_settings")).map((r) => [r.key, r.value]));
    expect(settings.hablemos.title).toBe("¿Empezamos tu próximo *proyecto?*");
    expect(settings.navigation.footer_title).toBe("Mi pie editado");
    expect(settings.navigation.preloader_steps).toHaveLength(3);
    const scenes = Object.fromEntries((await db.query<{ key: string; data: Record<string, unknown> }>("select key, data from public.scenes")).map((r) => [r.key, r.data]));
    expect(scenes.hero.photo_caption).toMatch(/Proceso ROWE/);
    expect(scenes.hero.process_steps).toHaveLength(3);
    expect(scenes.web.screen_caption).toBe("Mi pie del visor");
    expect(scenes.web.view_mobile).toBe("Móvil");
  });

  it("menú: añade el resumen de cada sección sin pisar uno editado", async () => {
    await db.exec(`
      update public.site_settings set value = jsonb_set(value, '{items}', (
        select jsonb_agg(case when it->>'href' = '/web' then it || '{"summary":"Mi resumen"}' else it - 'summary' end)
        from jsonb_array_elements(value->'items') it
      )) where key = 'navigation';
    `);
    await seedContent(db, { log: () => {} });
    const [{ value }] = await db.query<{ value: { items: { href: string; summary: string }[] } }>("select value from public.site_settings where key = 'navigation'");
    const byHref = Object.fromEntries(value.items.map((i) => [i.href, i.summary]));
    expect(byHref["/web"]).toBe("Mi resumen");
    expect(byHref["/proyectos"]).toMatch(/Trabajos recientes/);
    expect(byHref["/#hablemos"]).toMatch(/24 h/);
  });
});

describe("servidor (service_role)", () => {
  it("numera los presupuestos ROWE-AAAA-NNNN", async () => {
    const [q] = await db.query<{ number: string }>(
      `insert into public.quotes (selections, items, one_min, one_max, weeks_min, weeks_max, level, release_version)
       values ('{}', '[]', 900, 1400, 3, 4, 'Esencial', 1) returning number`,
    );
    expect(q.number).toMatch(/^ROWE-\d{4}-0001$/);
  });

  it("valida los leads en la propia base de datos", async () => {
    await expect(
      db.query(`insert into public.leads (origin, need, name, email, privacy_accepted_at) values ('formulario', 'Web', 'Ana', 'no-es-un-email', now())`),
    ).rejects.toThrow(/leads_email_check/);
    await expect(
      db.query(`insert into public.leads (origin, need, name, email) values ('formulario', 'Web', 'Ana', 'ana@negocio.es')`),
    ).rejects.toThrow(/privacy_accepted_at/);
  });

  it("rechaza JSON doblemente codificado (objeto guardado como texto)", async () => {
    await expect(
      db.query(`update public.scenes set data = to_jsonb('{"steps":[]}'::text) where key = 'hero'`),
    ).rejects.toThrow(/scenes_data_object/);
    const [{ bad }] = await db.query<{ bad: number }>(
      "select count(*)::int as bad from public.site_settings where jsonb_typeof(value) <> 'object'",
    );
    expect(bad).toBe(0);
  });

  it("limita los envíos por IP", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const [{ ok }] = await db.query<{ ok: boolean }>("select public.check_rate_limit('lead:1.2.3.4', 3, 600) as ok");
      results.push(ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });
});
