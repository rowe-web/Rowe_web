import { createClient } from "@supabase/supabase-js";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Fase 3 · Configurador, formulario, leads, PDF, analítica y cookies.
 * Comprueba los datos en la base de datos REAL y borra lo que crea al terminar
 * (emails de prueba: e2e+…@example.com).
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* en CI las variables vienen del entorno */
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const run = Date.now();
const testEmail = (tag: string) => `e2e+${run}-${tag}@example.com`;
const createdQuotes: string[] = [];

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "escritorio", "Flujo de datos: una sola vez (escritorio)"));

test.afterAll(async () => {
  const { data: leads } = await db.from("leads").select("id, quote_id").like("email", `e2e+${run}-%`);
  const quoteIds = [...createdQuotes, ...(leads ?? []).map((l) => l.quote_id).filter(Boolean)];
  await db.from("leads").delete().like("email", `e2e+${run}-%`); // borra también su cola de emails
  if (quoteIds.length) await db.from("quotes").delete().in("id", quoteIds);
  await db.from("events").delete().like("path", "/e2e-%");
});

async function open(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("rowe:intro", "1");
    if (!localStorage.getItem("rowe-consent")) localStorage.setItem("rowe-consent", "denied");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
}

async function waitFor<T>(fn: () => Promise<T | null | undefined>, ms = 10000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error("Tiempo de espera agotado");
    await new Promise((r) => setTimeout(r, 400));
  }
}

const post = (request: APIRequestContext, body: Record<string, unknown>, ip: string) =>
  request.post("/api/leads", { data: body, headers: { "x-forwarded-for": ip } });

const baseLead = (tag: string) => ({
  need: "Web",
  sector: "Salud",
  budget: "1.000 – 2.500 €",
  message: "Prueba automática",
  name: "Prueba E2E",
  company: "ROWE QA",
  email: testEmail(tag),
  phone: "",
  city: "Madrid",
  privacy: true,
  website: "",
  elapsed: 9000,
});

test("formulario «Hablemos»: 5 tomas → «Grabado» → lead guardado aunque el email falle", async ({ page }) => {
  await open(page);
  await page.evaluate(() => (window as unknown as { __rowe: { lenis: { scrollTo: (t: string, o: object) => void } } }).__rowe.lenis.scrollTo("#hablemos", { immediate: true, force: true }));
  const form = page.locator("#hablemos");
  await form.getByRole("radio", { name: "Web", exact: true }).click();
  await form.getByRole("radio", { name: "Salud" }).click();
  await form.getByRole("radio", { name: "1.000 – 2.500 €" }).click();
  await form.getByRole("textbox").fill("Quiero renovar la web de mi clínica.");
  await page.waitForTimeout(2600); // más que el tiempo mínimo humano
  await form.getByRole("button", { name: /Siguiente/ }).click();
  // Validación: sin datos no deja enviar
  await form.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(form.getByText("Necesitamos tu nombre")).toBeVisible();
  await expect(form.getByText("Revisa el email")).toBeVisible();
  await form.getByLabel("Nombre *").fill("Prueba E2E");
  await form.getByLabel("Email *").fill(testEmail("form"));
  // Ubicación / ciudad (obligatoria): para valorar la logística de un rodaje
  await expect(form.getByText("Indícanos tu ciudad")).toBeVisible();
  const city = form.getByLabel("Ubicación / Ciudad *");
  await expect(city).toHaveAttribute("placeholder", "Ej. Madrid, Barcelona...");
  await city.fill("Valencia");
  await form.getByRole("checkbox").click();
  await form.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(form.getByText("Grabado.")).toBeVisible({ timeout: 15000 });

  const lead = await waitFor(async () => (await db.from("leads").select("*").eq("email", testEmail("form")).maybeSingle()).data);
  expect(lead).toMatchObject({ origin: "formulario", need: "Web", sector: "Salud", budget_label: "1.000 – 2.500 €", city: "Valencia", status: "nuevo" });
  expect(lead.ip_hash).toMatch(/^[0-9a-f]{32}$/);
  // El aviso por email queda registrado (fallido si no hay email configurado, enviado si lo hay)
  const mail = await waitFor(async () => {
    const { data } = await db.from("email_outbox").select("status, attempts, last_error, payload").eq("lead_id", lead.id).eq("template", "new-lead").maybeSingle();
    return data && data.attempts > 0 ? data : null;
  });
  expect(["sent", "failed"]).toContain(mail.status);
  expect(mail.payload).toMatchObject({ city: "Valencia" }); // va en el aviso por email
  if (mail.status === "failed") expect(mail.last_error).toBeTruthy();

  // Confirmación al cliente (si está activada en Ajustes): después del aviso, a su email, con el resumen
  const { data: setting } = await db.from("site_settings").select("value").eq("key", "confirmation_email").maybeSingle();
  if ((setting?.value as { enabled?: boolean } | null)?.enabled) {
    const confirmation = await waitFor(async () => {
      const { data } = await db.from("email_outbox").select("id, status, attempts, to_addresses, payload").eq("lead_id", lead.id).eq("template", "lead-confirmation").maybeSingle();
      return data && data.attempts > 0 ? data : null;
    });
    expect(confirmation.to_addresses).toEqual([testEmail("form")]);
    expect(confirmation.payload).toMatchObject({ name: "Prueba E2E", need: "Web", sector: "Salud", budget: "1.000 – 2.500 €", quoteNumber: null });
    expect(["sent", "failed"]).toContain(confirmation.status);
  }
});

test("configurador → «Enviar y hablemos» → overlay precargado → lead con presupuesto recalculado", async ({ page }) => {
  await open(page);
  await page.evaluate(() => (window as unknown as { __rowe: { lenis: { scrollTo: (t: string, o: object) => void } } }).__rowe.lenis.scrollTo("#presupuesto", { immediate: true, force: true }));
  const cfg = page.locator("#rw-cfg");
  await cfg.getByRole("radio", { name: /Web nueva/ }).click();
  await cfg.getByRole("switch", { name: /SEO local/ }).click();
  await expect(page.locator("#rw-monitor")).toContainText("900 – 1.450 €");
  await page.getByRole("button", { name: /Enviar y hablemos/ }).click();

  const overlay = page.getByRole("dialog", { name: "Hablemos" });
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText("900 – 1.450 €"); // caja «Tu configuración»
  await expect(overlay.getByRole("radio", { name: "Web", exact: true })).toHaveAttribute("aria-checked", "true");
  await overlay.getByRole("button", { name: /Siguiente/ }).click();
  await overlay.getByRole("radio", { name: "Comercio" }).click();
  await expect(overlay.getByRole("radio", { name: /900 – 1.450 €/ })).toHaveAttribute("aria-checked", "true");
  await overlay.getByRole("button", { name: /Siguiente/ }).click();
  await overlay.getByRole("button", { name: /Siguiente/ }).click();
  await overlay.getByLabel("Nombre *").fill("Prueba Configurador");
  await overlay.getByLabel("Email *").fill(testEmail("cfg"));
  await overlay.getByLabel("Ubicación / Ciudad *").fill("Madrid");
  await overlay.getByRole("checkbox").click();
  await page.waitForTimeout(2600);
  await overlay.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(overlay.getByText("Grabado.")).toBeVisible({ timeout: 15000 });

  const lead = await waitFor(async () => (await db.from("leads").select("*").eq("email", testEmail("cfg")).maybeSingle()).data);
  expect(lead).toMatchObject({ origin: "configurador", budget_label: "900 – 1.450 €" });
  const { data: quote } = await db.from("quotes").select("*").eq("id", lead.quote_id).single();
  expect(quote.number).toMatch(/^ROWE-\d{4}-\d{4,}$/);
  expect([quote.one_min, quote.one_max]).toEqual([900, 1450]);
  // Confirmación al cliente (si está activada): con su nº de presupuesto y el presupuesto para el PDF adjunto
  const { data: setting } = await db.from("site_settings").select("value").eq("key", "confirmation_email").maybeSingle();
  if ((setting?.value as { enabled?: boolean } | null)?.enabled) {
    const confirmation = await waitFor(async () => {
      const { data } = await db.from("email_outbox").select("status, attempts, last_error, payload").eq("lead_id", lead.id).eq("template", "lead-confirmation").maybeSingle();
      return data && data.attempts > 0 ? data : null;
    });
    expect(confirmation.payload).toMatchObject({ quoteNumber: quote.number, quote: { one: [900, 1450] } });
    // Con EMAIL_DRY_RUN no sale nada, pero el email (con el PDF) se ha generado sin errores
    if (confirmation.status === "failed") expect(confirmation.last_error).not.toMatch(/PDF|plantilla|Plantilla/);
  }
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);
});

test("el servidor ignora el precio del navegador y recalcula con la base de datos", async ({ request }) => {
  const res = await post(request, { ...baseLead("forge"), budget: "cfg", selection: { tipo: "nueva", tienda: true, hack: 1 }, budget_label: "1 €", one_min: 1 }, "10.0.0.1");
  expect(res.status()).toBe(201);
  const { data: lead } = await db.from("leads").select("budget_label, quote_id").eq("email", testEmail("forge")).single();
  expect(lead!.budget_label).toBe("1.450 – 2.300 €"); // 720–1.120 + 720–1.200
});

test("anti-spam: campo trampa y envíos demasiado rápidos no se guardan", async ({ request }) => {
  const trap = await post(request, { ...baseLead("trap"), website: "http://spam" }, "10.0.0.2");
  const fast = await post(request, { ...baseLead("fast"), elapsed: 400 }, "10.0.0.3");
  expect(trap.status()).toBe(201); // el bot cree que ha funcionado
  expect(fast.status()).toBe(201);
  const { count } = await db.from("leads").select("id", { count: "exact", head: true }).in("email", [testEmail("trap"), testEmail("fast")]);
  expect(count).toBe(0);
});

test("validación en servidor: devuelve los campos con error", async ({ request }) => {
  const res = await post(request, { ...baseLead("invalid"), email: "no-es-email", city: " ", privacy: false }, "10.0.0.4");
  expect(res.status()).toBe(400);
  expect((await res.json()).fields.sort()).toEqual(["city", "email", "privacy"]);
  const bad = await post(request, { ...baseLead("badopt"), need: "Algo inventado" }, "10.0.0.4");
  expect(bad.status()).toBe(400);
});

test("límite de envíos por IP: el 6.º en una hora se rechaza", async ({ request }) => {
  const ip = `10.9.${run % 250}.${(run >> 8) % 250}`;
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await post(request, baseLead(`rate${i}`), ip)).status());
  expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
});

test("PDF del presupuesto: real, numerado y registrado", async ({ request }) => {
  const res = await request.post("/api/quote/pdf", { data: { selection: { tipo: "contenido", reels: "reels8", fotos: true } } });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  const body = await res.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.length).toBeGreaterThan(10_000);
  const number = res.headers()["x-quote-number"];
  expect(number).toMatch(/^ROWE-\d{4}-\d{4,}$/);
  const { data: q } = await db.from("quotes").select("id, pdf_downloaded_at, one_min, one_max, monthly_min, monthly_max").eq("number", number).single();
  createdQuotes.push(q!.id);
  expect(q!.pdf_downloaded_at).toBeTruthy();
  expect([q!.one_min, q!.one_max, q!.monthly_min, q!.monthly_max]).toEqual([950, 1500, 190, 260]);
  // «Solo contenido»: el servidor recalcula sin partidas de web aunque lleguen marcadas
  const redes = await request.post("/api/quote/pdf", { data: { selection: { tipo: "redes", reels: "reels4", tienda: true, mant: true } } });
  expect(redes.status()).toBe(200);
  const { data: qr } = await db.from("quotes").select("id, one_min, one_max, monthly_min, monthly_max").eq("number", redes.headers()["x-quote-number"]).single();
  createdQuotes.push(qr!.id);
  expect([qr!.one_min, qr!.one_max, qr!.monthly_min, qr!.monthly_max]).toEqual([150, 200, 110, 150]);
  const empty = await request.post("/api/quote/pdf", { data: { selection: {} } });
  expect(empty.status()).toBe(400);
});

test("analítica: guarda el evento sin datos personales", async ({ request }) => {
  const res = await request.post("/api/events", { data: { type: "pageview", path: "/e2e-test", referrer: "https://l.instagram.com/x", session: "sesion-de-prueba-123" } });
  expect(res.status()).toBe(204);
  const { data } = await db.from("events").select("referrer_source, session_hash").eq("path", "/e2e-test").single();
  expect(data!.referrer_source).toBe("Instagram");
  expect(data!.session_hash).not.toContain("sesion");
});

test("tarea de reintento de emails: protegida por secreto", async ({ request }) => {
  expect((await request.get("/api/cron/email-retry")).status()).toBe(401);
  const ok = await request.get("/api/cron/email-retry", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("sent");
});

test("cookies: primera visita → banner; «Rechazar» lo guarda; el pie lo reabre", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("rowe:intro", "1"));
  await page.goto("/", { waitUntil: "networkidle" });
  const banner = page.getByRole("dialog", { name: "Preferencias de cookies" });
  await expect(banner).toBeVisible({ timeout: 5000 });
  await banner.getByRole("button", { name: "Rechazar" }).click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("rowe-consent"))).toBe("denied");
  await page.getByRole("button", { name: "Preferencias de cookies" }).click();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("switch", { name: /Analítica/ })).toHaveAttribute("aria-checked", "false");
});
