import { expect, test, type Page } from "@playwright/test";

/**
 * Ajustes previos a la Fase 6: espaciado «/ >» del preloader, el logo siempre vuelve al
 * inicio con scroll suave, punto REC ↔ </> y vista previa + resumen en el menú.
 * No escribe en la base de datos.
 */
type RoweDebug = { lenis: { scrollTo: (y: number | string, o?: object) => void; scroll: number } };
const errors: string[] = [];

async function open(page: Page, path = "/", { intro = false } = {}) {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript((intro) => {
    if (!intro) sessionStorage.setItem("rowe:intro", "1");
    localStorage.setItem("rowe-consent", "denied");
  }, intro);
  await page.goto(path, { waitUntil: intro ? "domcontentloaded" : "networkidle" });
  await page.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
}

/** La cabecera se esconde al bajar: se sube un poco para que reaparezca, como haría una persona. */
async function revealHeader(page: Page) {
  await page.mouse.wheel(0, -240);
  await expect(page.locator("[data-site-header] a[aria-label='ROWE — Inicio']")).toBeInViewport();
  await page.waitForTimeout(700);
}

const jump = (page: Page, target: number | string) =>
  page.evaluate((t) => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(t, { immediate: true, force: true }), target);

test("preloader: «/» y «>» del cierre separados", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await open(page, "/", { intro: true });
  const gap = await page.locator("[data-preloader]").evaluate((root) => {
    const close = [...root.querySelectorAll("span")].find((s) => s.textContent === "/>" && s.children.length === 1)!;
    const gt = close.firstElementChild!;
    const r = document.createRange();
    r.setStart(close.firstChild!, 0);
    r.setEnd(close.firstChild!, 1);
    return gt.getBoundingClientRect().left - r.getBoundingClientRect().right;
  });
  expect(gap).toBeGreaterThan(2);
});

test("logo: en la home vuelve arriba con scroll suave y quita el ancla", async ({ page }) => {
  await open(page);
  await jump(page, "#presupuesto");
  await page.evaluate(() => history.replaceState(null, "", "/#presupuesto"));
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1500);
  await revealHeader(page);

  await page.locator("[data-site-header] a[aria-label='ROWE — Inicio']").click();
  // A mitad del viaje sigue bajando de forma progresiva (no es un salto)
  await page.waitForTimeout(350);
  const mid = await page.evaluate(() => window.scrollY);
  expect(mid).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBe(0);
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator("#hero")).toBeInViewport();
  expect(errors).toEqual([]);
});

test("logo: desde otra página lleva al inicio, arriba del todo", async ({ page }) => {
  await open(page, "/proyectos");
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(600);
  await revealHeader(page);
  await page.locator("[data-site-header] a[aria-label='ROWE — Inicio']").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#hero")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBe(0);
  expect(errors).toEqual([]);
});

test("REC ↔ </>: en la cabecera, en Hablemos y en el pie", async ({ page }) => {
  await open(page);
  for (const sel of ["[data-site-header]", "#hablemos", "[data-site-footer]"]) {
    const morph = page.locator(`${sel} [data-rec-morph]`).first();
    await expect(morph).toBeAttached();
    await expect(morph.locator("svg path")).toHaveCount(3);
    // El punto y el símbolo están animados (bucle infinito)
    const anims = await morph.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => (a.effect?.getTiming().iterations ?? 1) === Infinity).length);
    expect(anims).toBeGreaterThanOrEqual(4);
  }
});

test("menú: vista previa animada y resumen de cada sección al pasar el cursor", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await open(page);
  await page.getByRole("button", { name: "Menú" }).click();
  const menu = page.locator("[data-site-menu]");
  await expect(menu).toBeVisible();

  const cases: [string, string, RegExp][] = [
    ["Inicio", "inicio", /showreel/i],
    ["Desarrollo web", "web", /Webs a medida/],
    ["Producción audiovisual", "audiovisual", /Guion, rodaje y edición/],
    ["Proyectos", "proyectos", /Trabajos recientes/],
    ["Presupuesto", "presupuesto", /precio orientativo/],
    ["Hablemos", "hablemos", /24 h/],
  ];
  for (const [label, kind, summary] of cases) {
    await menu.locator("[data-menu-item] a").filter({ hasText: label }).hover();
    await expect(menu.locator(`[data-menu-preview='${kind}']`)).toBeVisible();
    await expect(menu.locator("figcaption")).toContainText(summary);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  expect(errors).toEqual([]);
});
