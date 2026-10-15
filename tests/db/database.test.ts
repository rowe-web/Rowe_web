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
