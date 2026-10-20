import { randomBytes } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Fase 4 · Panel de administración contra la base de datos REAL.
 * Crea sus propios usuarios de prueba (e2e+…@example.com: nunca usa la contraseña del
 * administrador real) y deja todo como estaba al terminar: usuarios, mensajes,
 * medios, versiones publicadas y entradas del historial que haya creado.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* en CI las variables vienen del entorno */
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const run = Date.now();
const email = (tag: string) => `e2e+${run}-${tag}@example.com`;
const password = randomBytes(12).toString("base64url");
const users: Record<"admin" | "editor", { id: string; email: string }> = {} as never;
let baseline: { audit: number; version: number; estudio: string };

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "escritorio", "Panel: una sola vez (escritorio)"));

test.beforeAll(async () => {
  for (const role of ["admin", "editor"] as const) {
    const { data, error } = await db.auth.admin.createUser({ email: email(role), password, email_confirm: true, app_metadata: { role }, user_metadata: { full_name: `E2E ${role}` } });
    if (error) throw error;
    // Supabase guarda app_metadata después de crear el usuario: el rol se pone en el perfil (como hace «Invitar»)
    const { error: roleError } = await db.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) throw roleError;
    users[role] = { id: data.user.id, email: email(role) };
  }
  const [{ data: audit }, { data: rel }, { data: scene }] = await Promise.all([
    db.from("audit_log").select("id").order("id", { ascending: false }).limit(1).maybeSingle(),
    db.from("releases").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
    db.from("scenes").select("title").eq("key", "estudio").single(),
  ]);
  baseline = { audit: audit?.id ?? 0, version: rel?.version ?? 0, estudio: scene!.title };
});

test.afterAll(async () => {
  // Contenido: la escena vuelve a su texto (por si una prueba falló a medias)
  await db.from("scenes").update({ title: baseline.estudio }).eq("key", "estudio");
  // Versiones y entradas del historial creadas por las pruebas
  await db.from("releases").delete().gt("version", baseline.version);
  await db.from("audit_log").delete().gt("id", baseline.audit);
  await db.from("leads").delete().like("email", `e2e+${run}-%`);
  const { data: media } = await db.from("media").select("id, path").like("file_name", `e2e-${run}%`);
  if (media?.length) {
    await db.storage.from("media").remove(media.map((m) => m.path));
    await db.from("media").delete().in("id", media.map((m) => m.id));
  }
  const { data: invited } = await db.from("profiles").select("id").like("email", `e2e+${run}-%`);
  for (const u of invited ?? []) await db.auth.admin.deleteUser(u.id);
});

async function login(page: Page, role: "admin" | "editor", next = "/admin") {
  await page.goto(`/admin/acceso?next=${encodeURIComponent(next)}`);
  await page.locator("#login-email").fill(users[role].email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

/** PNG válido de 16×16 (gris) generado al vuelo, sin ficheros de prueba. */
function tinyPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(16, 0);
  ihdr.writeUInt32BE(16, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  const raw = Buffer.alloc(16 * (1 + 16 * 3), 0x80);
  for (let y = 0; y < 16; y++) raw[y * (1 + 16 * 3)] = 0; // filtro «none» por fila
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Texto visible de la home publicada (las escenas parten los titulares en palabras). */
const publicText = async (request: APIRequestContext) =>
  (await (await request.get("/")).text())
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");

const toast = (page: Page, text: string | RegExp) => expect(page.getByRole("status").filter({ hasText: text })).toBeVisible();

/** Publica: si la lista de lanzamiento avisa de bloqueantes (contenido provisional real), «Publicar igualmente». */
async function published(page: Page) {
  const dialog = page.locator("[data-launch-dialog]");
  const done = page.getByRole("status").filter({ hasText: "Publicado" });
  await expect(dialog.or(done).first()).toBeVisible();
  if (await dialog.isVisible()) await dialog.getByRole("button", { name: "Publicar igualmente" }).click();
  await expect(done).toBeVisible();
}

async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, ms = 10000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error("Tiempo de espera agotado");
    await new Promise((r) => setTimeout(r, 400));
  }
}

test("acceso: contraseña incorrecta, sin sesión → login, y el editor no ve precios ni usuarios", async ({ page }) => {
  await page.goto("/admin/mensajes");
  await expect(page).toHaveURL(/\/admin\/acceso\?next=%2Fadmin%2Fmensajes/);
  await page.locator("#login-email").fill(users.editor.email);
  await page.locator("#login-password").fill("no-es-la-contraseña");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/contraseña incorrectos/)).toBeVisible();

  await login(page, "editor");
  const nav = page.getByRole("complementary");
  await expect(nav.getByRole("link", { name: "Textos y escenas" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Precios" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Usuarios" })).toHaveCount(0);
  await page.goto("/admin/precios");
  await expect(page.getByText("Solo administradores")).toBeVisible();
  await page.goto("/admin/usuarios");
  await expect(page.getByText("Solo administradores")).toBeVisible();
});

test("editor: edita una escena en borrador (la web no cambia) y la restaura desde el historial", async ({ page, request }) => {
  await login(page, "editor", "/admin/textos?escena=estudio");
  const title = `Titular E2E editor ${run}`;
  await page.locator("#sc-title").fill(title);
  await expect(page.getByText("● Sin guardar")).toBeVisible();
  await expect(page.getByRole("button", { name: /Publicar/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await toast(page, "Borrador guardado");
  const { data } = await db.from("scenes").select("title").eq("key", "estudio").single();
  expect(data!.title).toBe(title);
  expect(await publicText(request)).not.toContain(title);

  await page.goto("/admin/historial");
  const entry = page.locator("div", { hasText: title }).filter({ has: page.getByRole("button", { name: "Restaurar" }) }).last();
  await entry.getByRole("button", { name: "Restaurar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restaurar" }).click();
  await toast(page, "Versión restaurada");
  const after = await db.from("scenes").select("title").eq("key", "estudio").single();
  expect(after.data!.title).toBe(baseline.estudio);
});

test("admin: edita, publica, la web lo muestra; restaura y vuelve a publicar", async ({ page, request }) => {
  const { data: status } = await db.rpc("draft_status");
  test.skip(Boolean((status as { dirty: boolean } | null)?.dirty), "Hay cambios reales sin publicar: no se publica desde las pruebas");

  await login(page, "admin", "/admin/textos?escena=estudio");
  const title = `Titular E2E publicado ${run}`;
  await page.locator("#sc-title").fill(title);
  await page.getByRole("button", { name: "Guardar y publicar" }).click();
  await published(page);
  await waitFor(async () => (await publicText(request)).includes(title));

  await db.from("scenes").update({ title: baseline.estudio }).eq("key", "estudio");
  await page.reload();
  // El botón del editor de la escena (el de la barra superior es el primero)
  await page.getByRole("button", { name: "Publicar", exact: true }).last().click();
  await published(page);
  await waitFor(async () => !(await publicText(request)).includes(title));
  // Tras publicar, las páginas que se regeneran siguen funcionando (p. ej. el detalle de proyecto)
  const { data: project } = await db.from("projects").select("slug").eq("status", "publicado").limit(1).maybeSingle();
  if (project) expect((await request.get(`/proyectos/${project.slug}`)).status()).toBe(200);
  // Proyecto inexistente: 404 real (lo responde el proxy antes de pintar) con noindex
  const missing = await request.get("/proyectos/no-existe");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toMatch(/<meta name="robots" content="noindex/);
});

test("lista de lanzamiento: pendientes en el inicio y aviso accesible antes de publicar", async ({ page }) => {
  await login(page, "admin");
  const list = page.locator("[data-launch-list]");
  await expect(list.getByRole("heading", { name: "Lista de lanzamiento" })).toBeVisible();
  // El aviso antiguo de proyectos de ejemplo ya no está: va dentro de la lista
  await expect(page.getByText(/proyectos? de ejemplo del diseño publicados?\. Sustitúyelos/)).toHaveCount(0);
  const blocking = list.locator('[data-launch-group="Bloqueantes"] a');
  const pending = await list.locator("li a").count();
  if (!pending) {
    await expect(list.getByText("Todo listo para lanzar")).toBeVisible();
    return;
  }
  // Cada pendiente lleva a una pantalla del panel
  for (const href of await list.locator("li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).toMatch(/^\/admin\//);
  await expect(list).toContainText(`${pending} pendiente`);
  const blockers = await blocking.count();
  test.skip(blockers === 0, "Sin bloqueantes en la base real: no hay aviso que probar");

  // Guardar y publicar una escena sin cambios: aparece el aviso y «Revisar» no publica
  const { data: before } = await db.from("releases").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
  await page.goto("/admin/textos?escena=estudio");
  await expect(page.locator("#sc-title")).toBeVisible();
  // El botón del editor de la escena (el de la barra superior es el primero)
  await page.getByRole("button", { name: "Publicar", exact: true }).last().click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("button", { name: "Revisar" })).toBeFocused();
  await expect(dialog.locator("li")).toHaveCount(blockers);
  // Foco atrapado: desde el último, Tab vuelve al primero; y Mayús+Tab al revés
  await dialog.getByRole("button", { name: "Publicar igualmente" }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("a").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Publicar igualmente" })).toBeFocused();
  // Esc cierra sin publicar
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await toast(page, "Sin publicar");
  const { data: after } = await db.from("releases").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
  expect(after?.version ?? 0).toBe(before?.version ?? 0);
});

test("páginas: añade, edita, reordena y quita secciones de /web (borrador)", async ({ page }) => {
  const { data: before } = await db.from("pages").select("blocks").eq("slug", "web").single();
  try {
    await login(page, "editor", "/admin/ajustes?tab=paginas");
    await page.locator("div", { hasText: /^Desarrollo web/ }).getByRole("button", { name: "Editar →" }).first().click();
    await expect(page.getByText("Secciones de la página")).toBeVisible();
    const sections = page.locator("fieldset", { hasText: "Secciones de la página" });
    await sections.getByRole("button", { name: /Preguntas frecuentes/ }).click();
    const q = sections.getByLabel("Pregunta").first();
    await q.fill(`¿Pregunta E2E ${run}?`);
    await sections.locator("#add-section").selectOption("cierre");
    await sections.getByRole("button", { name: "+ Añadir sección" }).click();
    const count = (before!.blocks as unknown[]).length + 1;
    await sections.getByRole("button", { name: `Subir sección ${count}` }).click();
    await sections.getByRole("button", { name: `Quitar sección ${count - 1}` }).click();
    // Un editor no publica: su botón es «Guardar» (el borrador)
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await toast(page, "Borrador guardado");
    const { data: after } = await db.from("pages").select("blocks").eq("slug", "web").single();
    const blocks = after!.blocks as { type: string; items?: { q: string }[] }[];
    expect(blocks).toHaveLength(count - 1);
    expect(blocks.find((b) => b.type === "preguntas")!.items![0].q).toBe(`¿Pregunta E2E ${run}?`);
  } finally {
    await db.from("pages").update({ blocks: before!.blocks }).eq("slug", "web");
  }
});

test("mensajes: cambia el estado y guarda las notas solas", async ({ page }) => {
  const { data: lead, error } = await db
    .from("leads")
    .insert({ origin: "formulario", need: "Web", sector: "Salud", budget_label: "1.000 – 2.500 €", message: "Prueba E2E panel", name: "Lead E2E", company: "ROWE QA", email: email("lead"), phone: "", privacy_accepted_at: new Date().toISOString(), source: {} })
    .select("id")
    .single();
  if (error) throw error;
  await login(page, "editor", `/admin/mensajes?lead=${lead.id}`);
  await page.getByRole("radiogroup", { name: "Estado del mensaje" }).getByRole("radio", { name: "Contactado" }).click();
  await waitFor(async () => (await db.from("leads").select("status").eq("id", lead.id).single()).data?.status === "contactado");
  await page.getByPlaceholder("Ej. Llamar el lunes por la mañana.").fill("Llamar el martes");
  await expect(page.getByText("Guardado ✓")).toBeVisible();
  const { data } = await db.from("leads").select("notes").eq("id", lead.id).single();
  expect(data!.notes).toBe("Llamar el martes");

  // Responder: sale de la cuenta de ROWE y el borrador no se pierde al recargar (no se envía)
  await page.getByRole("button", { name: "Responder", exact: true }).click();
  const box = page.locator("[data-reply-box]");
  await expect(box).toContainText(`De · ${process.env.SMTP_USER}`);
  await expect(box).toContainText(`Para · ${email("lead")}`);
  await expect(box.getByLabel("Asunto")).toHaveValue("Tu proyecto con ROWE");
  await box.getByLabel("Respuesta").fill("Hola:\n\nBorrador E2E");
  await page.reload();
  await page.getByRole("button", { name: "Responder", exact: true }).click();
  await expect(page.locator("[data-reply-box]").getByLabel("Respuesta")).toHaveValue("Hola:\n\nBorrador E2E");
  await page.locator("[data-reply-box]").getByRole("button", { name: "Descartar" }).click();
  await expect(page.locator("[data-reply-box]")).toHaveCount(0);
  await page.getByRole("button", { name: "Responder", exact: true }).click();
  await expect(page.locator("[data-reply-box]").getByLabel("Respuesta")).not.toHaveValue(/Borrador E2E/);

  // Historial: cada respuesta de ROWE en su propio bloque, con el texto desplegable
  await db.from("lead_replies").insert({ lead_id: lead.id, to_email: email("lead"), from_email: process.env.SMTP_USER, sent_by_name: "QA", subject: "Tu proyecto con ROWE", body: "Texto enviado E2E", status: "sent" });
  await page.reload();
  const reply = page.locator("[data-reply]").first();
  await expect(reply).toContainText("Respuesta de ROWE");
  await expect(reply.getByText("Texto enviado E2E")).toBeHidden();
  await reply.getByText("Ver texto").click();
  await expect(reply.getByText("Texto enviado E2E")).toBeVisible();
  await expect(reply).toHaveCSS("border-left-width", "2px");
});

test("tiempo real: avisos abajo a la derecha (mensaje nuevo y respuesta por email) y conversación con 3 tipos", async ({ page }) => {
  const { data: lead, error } = await db
    .from("leads")
    .insert({ origin: "formulario", need: "Web", sector: "", budget_label: "", message: "Mensaje inicial E2E", name: "Cliente Hilo E2E", company: "Clínica E2E", email: email("hilo"), phone: "+34 656 180 539", city: "Valencia", privacy_accepted_at: new Date().toISOString(), source: {} })
    .select("id")
    .single();
  if (error) throw error;
  await db.from("lead_replies").insert({ lead_id: lead.id, to_email: email("hilo"), from_email: process.env.SMTP_USER, sent_by_name: "QA", subject: "Tu proyecto con ROWE", body: "Respuesta de ROWE E2E", status: "sent", message_id: `<e2e-${run}@gmail.com>` });
  await login(page, "admin", `/admin/mensajes?lead=${lead.id}`);
  await expect(page.locator("[data-thread='form']")).toContainText("Mensaje inicial E2E");
  // Contacto arriba: antes de la conversación, con email, WhatsApp y fecha de envío
  const contact = page.locator("[data-lead-contact]");
  await expect(contact).toContainText(email("hilo"));
  await expect(contact).toContainText("Enviado");
  // Teléfono completo (sin «…»): al pulsarlo abre WhatsApp; el icono de al lado llama
  const phone = contact.locator("[data-lead-phone]");
  await expect(phone).toHaveText("+34 656 180 539");
  await expect(phone).toHaveAttribute("href", "https://wa.me/34656180539");
  expect(await phone.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= el.closest("[data-lead-contact] > div")!.getBoundingClientRect().right)).toBe(true);
  await expect(contact.getByRole("link", { name: /Llamar/ })).toHaveAttribute("href", "tel:+34656180539");
  // Ubicación que dejó en el formulario
  await expect(contact.locator("[data-lead-city]")).toContainText("Ubicación");
  await expect(contact.locator("[data-lead-city]")).toContainText("Valencia");
  // Los mensajes del hilo salen plegados: «Ver texto» los despliega
  const form = page.locator("[data-thread='form']");
  await expect(form.getByText("Mensaje inicial E2E")).toBeHidden();
  await form.getByText("Ver texto").click();
  await expect(form.getByText("Mensaje inicial E2E")).toBeVisible();
  expect(await page.evaluate(() => {
    const c = document.querySelector("[data-lead-contact]")!;
    const t = document.querySelector("[data-thread='form']")!;
    return Boolean(c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(page.locator("[data-thread='rowe']")).toContainText("Respuesta de ROWE");
  // Que la suscripción esté lista antes de crear filas
  await page.waitForTimeout(2500);

  // Un cliente responde por email (lo que guarda la lectura del buzón)
  await db.from("lead_inbound").insert({
    lead_id: lead.id, received_at: new Date().toISOString(), from_email: email("hilo"), from_name: "Cliente Hilo E2E",
    subject: "Re: Tu proyecto con ROWE", body: "Respuesta del cliente E2E", full_text: "Respuesta del cliente E2E\n\nCliente Hilo | Gerente · Clínica E2E\ncliente@clinica-e2e.example\n\nEl sáb, 17 oct 2026 a las 18:10, ROWE (<rowe@example.com>)\nescribió:\n\n> cita", message_id: `<cliente-${run}@mail>`, in_reply_to: `<e2e-${run}@gmail.com>`, matched_by: "thread",
  });
  const replyAlert = page.locator("[data-live-alert]").filter({ hasText: "Respuesta por email" });
  await expect(replyAlert).toBeVisible({ timeout: 15000 });
  // Quién: «Nombre · Empresa» (lo que dejó en la web)
  await expect(replyAlert.locator("p").first()).toHaveText("Cliente Hilo E2E · Clínica E2E");
  await page.waitForTimeout(600); // fin de la entrada (sube 16 px al aparecer)
  const box = await replyAlert.boundingBox();
  const vp = page.viewportSize()!;
  // Esquina inferior derecha, separada del borde (32 px a la derecha, 24 px abajo)
  expect(vp.width - (box!.x + box!.width)).toBeGreaterThanOrEqual(31);
  expect(vp.width - (box!.x + box!.width)).toBeLessThan(48);
  expect(vp.height - (box!.y + box!.height)).toBeGreaterThanOrEqual(23);
  expect(box!.y + box!.height).toBeGreaterThan(vp.height - 200);
  // La conversación se actualiza sola, en orden: formulario → ROWE → cliente
  await expect(page.locator("[data-thread='client']")).toContainText("Respuesta del cliente E2E", { timeout: 10000 });
  expect(await page.locator("[data-thread]").evaluateAll((els) => els.map((e) => e.getAttribute("data-thread")))).toEqual(["form", "rowe", "client"]);
  await expect(page.locator("[data-thread='client']")).toContainText("Nueva");
  // «Nueva»: blanco puro en negrita sobre el rojo
  expect(await page.locator("[data-thread='client'] [data-new-badge]").evaluate((el) => { const c = getComputedStyle(el); return [c.color, Number(c.fontWeight) >= 600, c.textTransform, c.backgroundColor]; })).toEqual(["rgb(255, 255, 255)", true, "uppercase", "rgb(255, 59, 31)"]);
  const client = page.locator("[data-thread='client']");
  await expect(client.getByText("Respuesta del cliente E2E", { exact: true })).toBeHidden();
  await client.getByText("Ver texto").click();
  // Solo el mensaje nuevo: sin la cita del email anterior ni la firma
  await expect(client.locator("[data-client-text]")).toHaveText("Respuesta del cliente E2E");
  await expect(client.getByText("> cita")).toBeHidden();
  await expect(client.getByText(/Gerente/)).toBeHidden();
  // El email completo, con un botón aparte
  await client.getByText("Ver email completo").click();
  await expect(client.getByText("> cita")).toBeVisible();
  await expect(client.getByText("Ocultar email completo")).toBeVisible();

  // Mensaje nuevo desde la web
  await db.from("leads").insert({ origin: "configurador", need: "Audiovisual", sector: "", budget_label: "", message: "", name: "Lead Tiempo Real E2E", company: "QA", email: email("rt"), phone: "", privacy_accepted_at: new Date().toISOString(), source: {} });
  const leadAlert = page.locator("[data-live-alert]").filter({ hasText: "Lead Tiempo Real E2E" });
  await expect(leadAlert).toBeVisible({ timeout: 15000 });
  await expect(leadAlert).toContainText("Nuevo presupuesto");
  await leadAlert.getByRole("link", { name: /Ver mensaje/ }).click();
  await expect(page).toHaveURL(/lead=/);
  await expect(page.locator("[data-thread='form']")).toContainText("Configurador");

  // Al abrir el mensaje, sus respuestas pasan a vistas
  await waitFor(async () => (await db.from("lead_inbound").select("seen_at").eq("lead_id", lead.id).single()).data?.seen_at);
});

test("mensajes en móvil: un texto muy largo y sin espacios parte la línea y no se sale de la pantalla", async ({ page }) => {
  const long = "x".repeat(700); // cadena continua, sin espacios (el formulario admite hasta 600; el email, más)
  const text = `${long} https://ejemplo-de-enlace-larguisimo.example.com/${"ruta/".repeat(40)} ${"Texto normal con espacios. ".repeat(30)}`;
  const { data: lead, error } = await db
    .from("leads")
    .insert({ origin: "formulario", need: "Web", sector: "", budget_label: "", message: "x".repeat(600), name: "Texto Largo E2E", company: "", email: email("largo"), phone: "", privacy_accepted_at: new Date().toISOString(), source: {} })
    .select("id")
    .single();
  if (error) throw error;
  const inbound = await db.from("lead_inbound").insert({
    lead_id: lead.id, received_at: new Date().toISOString(), from_email: email("largo"), from_name: "Texto Largo E2E",
    subject: `Re: ${"y".repeat(290)}`, body: text, full_text: `${text}\n\n> ${long}`, message_id: `<largo-${run}@mail>`, in_reply_to: null, matched_by: "sender",
  });
  if (inbound.error) throw inbound.error;
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "admin", `/admin/mensajes?lead=${lead.id}`);
  for (const kind of ["form", "client"]) {
    const item = page.locator(`[data-thread="${kind}"]`);
    await item.getByText("Ver texto").click();
    await expect(item.locator("[data-fold] p").first()).toBeVisible();
  }
  // Nada más ancho que la pantalla: ni la página, ni la zona con scroll, ni las cajas de los mensajes o sus párrafos
  const overflow = await page.evaluate(() => {
    const w = window.innerWidth;
    const bad = [...document.querySelectorAll("[data-thread], [data-thread] *")]
      .filter((el) => el.getBoundingClientRect().right > w + 0.5 || el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "hidden")
      .map((el) => `${el.tagName}.${el.className}`.slice(0, 80));
    const scrollers = [document.documentElement, ...document.querySelectorAll("main *")].filter((el) => el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX));
    return { bad, scrollers: scrollers.length, page: document.documentElement.scrollWidth - w };
  });
  expect(overflow).toEqual({ bad: [], scrollers: 0, page: 0 });
});

test("medios: sube con progreso, guarda el texto alternativo y borra del almacenamiento", async ({ page }) => {
  await login(page, "editor", "/admin/medios");
  const png = tinyPng();
  await page.locator('input[type="file"]').setInputFiles({ name: `e2e-${run}.png`, mimeType: "image/png", buffer: png });
  await toast(page, "Archivo subido");
  const row = await waitFor(async () => (await db.from("media").select("id, path, alt").like("file_name", `e2e-${run}%`).maybeSingle()).data);

  await page.getByPlaceholder("Describe la imagen").fill("Imagen de prueba");
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  expect((await db.from("media").select("alt").eq("id", row.id).single()).data!.alt).toBe("Imagen de prueba");

  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await toast(page, /Archivo eliminado/);
  expect((await db.from("media").select("id").eq("id", row.id)).data).toHaveLength(0);
  const folder = row.path.split("/").slice(0, -1).join("/");
  const { data: files } = await db.storage.from("media").list(folder, { search: row.path.split("/").pop() });
  expect(files ?? []).toHaveLength(0);
});

test("precios: un mínimo mayor que el máximo se marca y no se guarda", async ({ page }) => {
  await login(page, "admin", "/admin/precios");
  const before = (await db.from("config_options").select("price_min, price_max").eq("key", "seo").single()).data!;
  const min = page.getByRole("textbox", { name: "Mínimo de SEO local" });
  await min.fill("99999");
  await expect(page.getByText("El mínimo no puede ser mayor que el máximo.").first()).toBeVisible();
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await toast(page, /mínimo no puede ser mayor/);
  expect((await db.from("config_options").select("price_min, price_max").eq("key", "seo").single()).data).toEqual(before);
  await expect(page.getByText("Simulación en vivo")).toBeVisible();

  // Simulación: desplegables propios de ROWE (ningún <select> nativo), oscuros cerrados y abiertos
  const sim = page.locator("[data-sim-scroll]");
  await expect(sim.locator("select")).toHaveCount(0);
  const trigger = sim.getByRole("button", { name: "¿Qué necesitas?" });
  const css = (el: Element, props: string[]) => props.map((p) => getComputedStyle(el).getPropertyValue(p));
  expect(await trigger.evaluate(css, ["background-color", "border-top-color", "color"])).toEqual(["rgb(17, 17, 17)", "rgb(51, 51, 51)", "rgb(237, 234, 228)"]);
  await trigger.click();
  const listbox = page.getByRole("listbox", { name: "¿Qué necesitas?" });
  await expect(listbox).toBeVisible();
  expect(await listbox.evaluate(css, ["background-color", "border-top-color"])).toEqual(["rgb(17, 17, 17)", "rgb(51, 51, 51)"]);
  const web = listbox.getByRole("option", { name: "Web nueva" });
  await web.hover();
  expect(await web.evaluate(css, ["background-color"])).toEqual(["rgb(34, 34, 34)"]);
  // Todas las opciones con texto claro y legible
  for (const color of await listbox.getByRole("option").evaluateAll((els) => els.map((e) => getComputedStyle(e).color))) {
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    expect((r + g + b) / 3).toBeGreaterThan(110);
  }
  await web.click();
  await expect(listbox).toBeHidden();
  await expect(trigger).toHaveText("Web nueva");
  await expect(page.getByText("Pago único").or(page.getByText(/\/mes/)).first()).toBeVisible();
  // Con teclado: abrir, bajar, elegir y Esc para cerrar
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(listbox).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Rediseño");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
  const gap = await sim.evaluate((box) => {
    const sel = box.querySelector("[data-select]")!.getBoundingClientRect();
    // Borde derecho del área de contenido (sin la barra de scroll) menos el borde del desplegable
    const inner = box.getBoundingClientRect().left + box.clientWidth;
    return inner - sel.right;
  });
  expect(gap).toBeGreaterThanOrEqual(12);
});

test("usuarios: invita con enlace copiable y el rol queda guardado", async ({ page }) => {
  await login(page, "admin", "/admin/usuarios");
  // El modal, centrado en la ventana y entero (con el título holgado). Si la ventana es más baja que el modal
  // (móvil con el teclado abierto, portátil con zoom), empieza arriba con margen y se desplaza: nunca se corta
  const dialog = page.getByRole("dialog", { name: "Invitar usuario" });
  for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 420 }, { width: 390, height: 380 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    if (!(await dialog.isVisible())) await page.getByRole("button", { name: "Invitar usuario" }).click();
    const form = dialog.locator("form");
    await expect(form).toBeVisible();
    await page.waitForTimeout(600); // fin de la entrada
    const box = (await form.boundingBox())!;
    const title = (await form.getByText("Invitar usuario").boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(16);
    expect(title.y - box.y).toBeGreaterThanOrEqual(30);
    expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
    if (box.height + 40 <= size.height) {
      expect(box.y + box.height).toBeLessThanOrEqual(size.height - 16);
      expect(Math.abs(box.y + box.height / 2 - size.height / 2)).toBeLessThan(2);
    } else {
      const send = dialog.getByRole("button", { name: "Enviar invitación" });
      await send.scrollIntoViewIfNeeded();
      await expect(send).toBeInViewport();
    }
    await dialog.getByRole("button", { name: "Cancelar" }).click();
  }
  await page.getByRole("button", { name: "Invitar usuario" }).click();
  await page.locator("#inv-email").fill(email("invitado"));
  await page.getByRole("dialog").getByRole("radio", { name: "Editor" }).click();
  await page.getByRole("button", { name: "Enviar invitación" }).click();
  const link = page.getByRole("textbox", { name: "Enlace de invitación" });
  await expect(link).toHaveValue(/\/admin\/acceso\/confirmar\?token_hash=.+&type=invite/);
  const profile = await waitFor(async () => (await db.from("profiles").select("role").eq("email", email("invitado")).maybeSingle()).data);
  expect(profile.role).toBe("editor");
});
