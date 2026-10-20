import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Páginas internas, 404, SEO y accesibilidad (Fase 5), contra la web de producción.
 */

type RoweDebug = {
  ScrollTrigger: { getAll: () => { pin?: Element }[] };
  lenis: { scrollTo: (y: number, o?: object) => void };
};

const PAGES = ["/web", "/audiovisual", "/proyectos", "/contacto", "/aviso-legal", "/privacidad", "/cookies"];
const errors: string[] = [];

async function open(page: Page, path: string) {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript(() => {
    sessionStorage.setItem("rowe:intro", "1");
    localStorage.setItem("rowe-consent", "denied");
  });
  const res = await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
  return res;
}

/** Recorre la página entera con Lenis para que se disparen todos los revelados. */
async function scrollThrough(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h; y += 600) {
    await page.evaluate((y) => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(y, { immediate: true, force: true }), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
}

for (const path of PAGES) {
  test(`${path}: carga, titular, metadatos y revelados`, async ({ page }) => {
    const res = await open(page, path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("main#contenido")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\//);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);

    await scrollThrough(page);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main [data-reveal]")].filter((el) => el.offsetParent && getComputedStyle(el).opacity !== "1").length,
    );
    expect(hidden).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("textos legales: todas las marcas del titular están rellenas", async ({ page }) => {
  for (const path of ["/aviso-legal", "/privacidad", "/cookies"]) {
    await open(page, path);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\{(titular|nif|domicilio|email|web|dominio|alojamiento|actualizado)\}/);
    expect(await page.locator("main nav[aria-label='Índice'] a").count()).toBeGreaterThan(2);
  }
});

test("404 real: dirección inexistente y proyecto que no existe", async ({ page }) => {
  for (const path of ["/esta-pagina-no-existe", "/proyectos/no-existe", "/proyectos/logistica-vela"]) {
    const res = await open(page, path);
    expect(res?.status(), path).toBe(404);
    await expect(page.locator("h1")).toContainText("Escena eliminada");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    // Un solo marco de la web (cabecera y pie), aunque la 404 venga de dentro de una página
    await expect(page.locator("[data-site-footer]")).toHaveCount(1);
  }
});

test("proyectos: el filtro muestra solo la categoría elegida", async ({ page }) => {
  await open(page, "/proyectos");
  const cards = page.locator("main a[href^='/proyectos/']");
  const total = await cards.count();
  expect(total).toBeGreaterThan(1);
  await page.getByRole("button", { name: /^Audiovisual/ }).click();
  await expect(page.getByRole("button", { name: /^Audiovisual/ })).toHaveAttribute("aria-pressed", "true");
  const visible = await cards.evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => e.textContent ?? ""));
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.length).toBeLessThan(total);
  expect(visible.every((t) => /Audiovisual/.test(t))).toBe(true);
  await page.getByRole("button", { name: /^Todos/ }).click();
  expect(await cards.evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).length)).toBe(total);
});

test("preguntas frecuentes: se abren con teclado y solo una a la vez", async ({ page }) => {
  await open(page, "/web");
  const items = page.locator("main details");
  await items.nth(0).locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(items.nth(0)).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open", "");
  await expect(items.nth(0)).not.toHaveAttribute("open", "");
});

test("caso de estudio: ficha, tomas y siguiente proyecto", async ({ page }) => {
  const res = await open(page, "/proyectos/clinica-dental-mar");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Clínica Dental Mar");
  await expect(page.getByRole("heading", { name: "Reto" })).toBeVisible();
  const next = page.locator("section[aria-label='Siguiente proyecto'] a");
  const href = (await next.getAttribute("href")) ?? "";
  await next.scrollIntoViewIfNeeded();
  await next.click();
  await expect(page).toHaveURL((url) => url.pathname === href);
  // Next conserva oculta la página anterior (estado de ruta): solo cuenta la visible
  await expect(page.locator("h1:visible")).toHaveCount(1);
  await expect(page.locator("h1:visible")).not.toHaveText("Clínica Dental Mar");
});

test("escenas reutilizadas: el pin de Ecosistema vive en /audiovisual y no se fuga al salir", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "en móvil no hay pin");
  await open(page, "/audiovisual");
  const pins = () => page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.ScrollTrigger.getAll().filter((t) => t.pin).length);
  expect(await pins()).toBeGreaterThan(0);
  const link = page.locator("main a[href='/proyectos']").first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/proyectos$/);
  await page.waitForTimeout(1500);
  expect(await pins()).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/audiovisual$/);
  await page.waitForTimeout(1500);
  expect(await pins()).toBeGreaterThan(0);
});

test("SEO: sitemap con proyectos publicados y robots desde la variable de entorno", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/proyectos/clinica-dental-mar</loc>");
  expect(sitemap).not.toContain("logistica-vela");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/User-Agent: \*/i);
});

for (const path of ["/", ...PAGES, "/proyectos/clinica-dental-mar", "/no-existe"]) {
  test(`accesibilidad AA (axe): ${path}`, async ({ page }) => {
    await open(page, path);
    await scrollThrough(page);
    // Excluidos: estados ligados al scroll (palabras y pasos «aún no iluminados» en gris
    // decorativo, decisión de diseño de la Fase 1). El mismo texto pasa a contraste total.
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude("[data-off]")
      .exclude("[data-hero-title]")
      .exclude("[data-manifesto]")
      .analyze();
    const serious = result.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(serious).toEqual([]);
  });
}
