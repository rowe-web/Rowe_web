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

const posY = (page: Page) => page.evaluate(() => window.scrollY);
const stopped = (page: Page) => page.evaluate(() => (window as unknown as { __rowe: { lenis: { isStopped: boolean } } }).__rowe.lenis.isStopped);

test("logo: en la home, cortinilla → arriba del todo → la página vuelve a empezar", async ({ page }, info) => {
  await open(page);
  await jump(page, "#presupuesto");
  await page.evaluate(() => history.replaceState(null, "", "/#presupuesto"));
  await page.waitForTimeout(600);
  expect(await posY(page)).toBeGreaterThan(1500);
  await revealHeader(page);
  // Marca en el DOM actual: si la página se vuelve a montar, desaparece
  await page.locator("#hero").evaluate((el) => el.setAttribute("data-old", ""));

  await page.locator("[data-site-header] a[aria-label='ROWE — Inicio']").click();
  if (info.project.name === "escritorio") {
    // Misma cortinilla que el menú, con el destino
    await expect(page.locator(".rowe-curtain")).toBeVisible();
    await expect(page.locator(".rowe-curtain")).toContainText("Inicio");
  }
  await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
  expect(await posY(page)).toBe(0);
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator("#hero[data-old]")).toHaveCount(0);
  await expect(page.locator("#hero")).toBeInViewport();
  await expect(page.locator("#hero [data-hero-title] [data-line-inner]").first()).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, 0\)|none/);
  expect(await stopped(page)).toBe(false);
  expect(errors).toEqual([]);
});

test("logo: siempre clicable, también con el menú o «Hablemos» abiertos", async ({ page }, info) => {
  await open(page);
  // Con «Hablemos» abierto, a mitad de página (el botón de la cabecera solo existe en escritorio)
  if (info.project.name === "escritorio") {
    await jump(page, 4000);
    await revealHeader(page);
    await page.locator("[data-site-header]").getByRole("button", { name: /Hablemos/ }).click();
    const dialog = page.getByRole("dialog", { name: "Hablemos" });
    await expect(dialog).toBeVisible();
    await dialog.locator("a[aria-label='ROWE — Inicio']").click();
    await expect(dialog).toHaveCount(0, { timeout: 6000 });
    await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
    expect(await posY(page)).toBe(0);
    expect(await stopped(page)).toBe(false);
  }

  // Con el menú abierto
  await jump(page, 3000);
  await revealHeader(page);
  await page.getByRole("button", { name: "Menú" }).click();
  const menu = page.locator("[data-site-menu]");
  await expect(menu).toBeVisible();
  await menu.locator("a[aria-label='ROWE — Inicio']").click();
  await expect(menu).toBeHidden({ timeout: 6000 });
  await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
  expect(await posY(page)).toBe(0);
  expect(await stopped(page)).toBe(false);

  // Varias veces seguidas: sin ScrollTriggers acumulados
  const count = () => page.evaluate(() => (window as unknown as { __rowe: { ScrollTrigger: { getAll: () => unknown[] } } }).__rowe.ScrollTrigger.getAll().length);
  const before = await count();
  for (let i = 0; i < 3; i++) {
    await jump(page, 2000);
    await revealHeader(page);
    await page.locator("[data-site-header] a[aria-label='ROWE — Inicio']").click();
    await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
  }
  expect(await count()).toBeLessThanOrEqual(before);
  expect(errors).toEqual([]);
});

test("menú: «Presupuesto» y «Hablemos» aterrizan exactos, desde la home y desde otra página", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await open(page);
  const viaMenu = async (label: string) => {
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Menú" }).click();
    await page.locator("[data-menu-item] a").filter({ hasText: label }).click();
  };
  const landed = async (sel: string) => {
    await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 8000 });
    await expect.poll(() => page.locator(sel).evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 8000 }).toBe(0);
    await page.waitForTimeout(800); // y se queda ahí
    expect(Math.abs(await page.locator(sel).evaluate((el) => el.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  };
  await viaMenu("Presupuesto");
  await landed("#presupuesto");
  await viaMenu("Hablemos");
  await landed("#hablemos");
  for (const [label, sel] of [["Presupuesto", "#presupuesto"], ["Hablemos", "#hablemos"]]) {
    await viaMenu("Proyectos");
    await expect(page).toHaveURL(/\/proyectos$/);
    await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
    await viaMenu(label);
    await landed(sel);
  }
  expect(errors).toEqual([]);
});

test("navegación repetida (ir y volver atrás): nada se queda oculto ni bloqueado", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  test.setTimeout(150_000);
  await open(page);
  for (const label of ["Desarrollo web", "Proyectos", "Producción audiovisual", "Desarrollo web"]) {
    await page.getByRole("button", { name: "Menú" }).click();
    await page.locator("[data-menu-item] a").filter({ hasText: label }).click();
    await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 6000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForTimeout(1200);
  }
  expect(await stopped(page)).toBe(false);
  // Recorre la home: todo lo que entra en pantalla termina visible
  const stuck = await page.evaluate(async () => {
    const out: number[] = [];
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += 700) {
      (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(y, { immediate: true, force: true });
      await new Promise((r) => setTimeout(r, 1100));
      document.querySelectorAll<HTMLElement>("[data-page] [data-reveal]").forEach((e) => {
        if (!e.offsetParent) return;
        const b = e.getBoundingClientRect();
        if (b.width && b.top < innerHeight - 100 && b.bottom > 100 && getComputedStyle(e).opacity === "0") out.push(Math.round(b.top + scrollY));
      });
    }
    return out;
  });
  expect(stuck).toEqual([]);
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
