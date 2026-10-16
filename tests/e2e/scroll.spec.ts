import { expect, test, type Page } from "@playwright/test";

/**
 * Pruebas del scroll y del movimiento (Fase 2), con el navegador real.
 * Se desplaza con la rueda real (pasa por Lenis) y se comprueban pins, timecode,
 * anclas, menú, cortinilla, botón «atrás» sin fugas, móvil y movimiento reducido.
 */

type RoweDebug = {
  ScrollTrigger: { getAll: () => { pin?: Element; trigger?: Element; start: number; end: number; vars: { id?: string } }[] };
  lenis: { scrollTo: (y: number, o?: object) => void; scroll: number };
};

const errors: string[] = [];

async function open(page: Page, path = "/", { intro = false } = {}) {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (!intro) await page.addInitScript(() => sessionStorage.setItem("rowe:intro", "1"));
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
}

/** Salta a una posición (sin animación) y espera a que todo se recoloque. */
async function jump(page: Page, y: number) {
  await page.evaluate((y) => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(y, { immediate: true, force: true }), y);
  await page.waitForTimeout(450);
}

async function pinRange(page: Page, scene: string) {
  return page.evaluate((scene) => {
    const st = (window as unknown as { __rowe: RoweDebug }).__rowe.ScrollTrigger.getAll().find(
      (t) => t.pin && (t.pin as HTMLElement).dataset.scene === scene,
    );
    return st ? { start: st.start, end: st.end } : null;
  }, scene);
}

const isDesktop = (name: string) => name === "escritorio";

test("preloader: avanza, se abre en letterbox y libera el scroll", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page, "/", { intro: true });
  await expect(page.locator("[data-preloader]")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/scroll-locked/);
  await expect(page.locator(".rowe-preloader")).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);
  // El titular ha entrado (las líneas ya no están desplazadas bajo la máscara)
  const y = await page.locator("[data-hero-title] [data-line-inner]").first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  expect(Math.abs(y)).toBeLessThan(2);
  expect(errors).toEqual([]);
});

test("timecode global: avanza al bajar y se rebobina al subir", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const tc = page.locator("[data-site-header] [data-tc]");
  await expect(tc).toHaveText("00:00:00:00");
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 300);
  await page.waitForTimeout(900);
  const down = await tc.textContent();
  expect(down).not.toBe("00:00:00:00");
  for (let i = 0; i < 14; i++) await page.mouse.wheel(0, -400);
  await page.waitForTimeout(1200);
  await expect(tc).toHaveText("00:00:00:00");
});

test("Escena 01: pin + manifiesto que se ilumina palabra a palabra", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const range = await pinRange(page, "estudio");
  expect(range).not.toBeNull();
  const lit = () =>
    page.locator("[data-manifesto] [data-word]").evaluateAll((ws) => ws.filter((w) => Number(getComputedStyle(w).opacity) > 0.95).length / ws.length);

  await jump(page, range!.start + (range!.end - range!.start) * 0.5);
  const top = await page.locator("#estudio").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(2); // pinneada
  const half = await lit();
  expect(half).toBeGreaterThan(0.3);
  expect(half).toBeLessThan(0.7);

  await jump(page, range!.end - 2);
  expect(await lit()).toBeGreaterThan(0.95);
});

test("Escena 05: ecosistema pinneado en 4 pasos", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const range = await pinRange(page, "ecosistema");
  expect(range).not.toBeNull();
  for (let i = 0; i < 4; i++) {
    await jump(page, range!.start + ((i + 0.5) / 4) * (range!.end - range!.start));
    const state = await page.locator("[data-eco-step]").evaluateAll((els) => els.map((e) => e.hasAttribute("data-off")));
    expect(state.filter((off) => !off)).toHaveLength(1);
    expect(state.indexOf(false)).toBe(i);
    await expect(page.locator("[data-eco-current]")).toHaveText(String(i + 1).padStart(2, "0"));
  }
});

test("Escena 04 · móvil: pasos en orden sin saltos, líneas que se rellenan con su paso y señal REC por las líneas", async ({ page }, info) => {
  test.skip(isDesktop(info.project.name));
  await open(page);
  const scene = page.locator("#ecosistema");
  const fills = () => scene.locator("[data-eco-seg]").evaluateAll((els) => els.map((e) => Math.round(new DOMMatrix(getComputedStyle(e).transform).a * 100) / 100));
  const active = () => scene.locator("[data-eco-step]").evaluateAll((els) => els.findIndex((e) => !e.hasAttribute("data-off")));
  const listTop = await scene.locator("ol").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const listH = await scene.locator("ol").evaluate((el) => el.getBoundingClientRect().height);
  const vh = page.viewportSize()!.height;

  // Antes de llegar a los pasos: líneas vacías y paso 01
  await page.evaluate((y) => window.scrollTo(0, y), listTop - vh);
  await page.waitForTimeout(1200);
  expect(await fills()).toEqual([0, 0, 0, 0]);
  expect(await active()).toBe(0);
  await expect(scene.locator("[data-eco-bar-signal]")).toHaveCSS("opacity", "1");

  // Un deslizamiento brusco hasta el final: el progreso recorre 01 → 02 → 03 → 04, sin saltos
  const seen = await page.evaluate(async ({ y }) => {
    const out: number[] = [];
    const read = () => [...document.querySelectorAll("#ecosistema [data-eco-step]")].findIndex((e) => !e.hasAttribute("data-off"));
    window.scrollTo(0, y);
    const t0 = performance.now();
    while (performance.now() - t0 < 2500) {
      const i = read();
      if (out[out.length - 1] !== i) out.push(i);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  }, { y: listTop + listH - vh * 0.4 });
  expect(seen).toEqual([0, 1, 2, 3]);
  expect(await fills()).toEqual([1, 1, 1, 1]);
  await expect(scene.locator("[data-eco-current]")).toHaveText("04");
  const sig = await scene.locator("[data-eco-bar-signal]").evaluate((el) => (el as HTMLElement).style.left);
  expect(parseFloat(sig)).toBeGreaterThan(99);

  // A mitad de la lista: el paso del centro y las líneas hasta él
  await page.evaluate((y) => window.scrollTo(0, y), listTop + listH * 0.4 - vh * 0.62);
  await page.waitForTimeout(1500);
  const i = await active();
  const f = await fills();
  expect(f.slice(0, i).every((v) => v === 1)).toBe(true);
  expect(f.slice(i + 1).every((v) => v === 0)).toBe(true);
});

test("lo que hay dentro de una escena pinneada se ve aunque se llegue de un salto", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const range = await pinRange(page, "ecosistema");
  await jump(page, range!.start + (range!.end - range!.start) * 0.3); // un solo salto desde arriba
  await page.waitForTimeout(1800);
  const titleOpacity = await page.locator("#ecosistema h2").evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(titleOpacity).toBeGreaterThan(0.95);
  // Y al saltar por encima de escenas (ancla) y volver, también están reveladas
  await jump(page, 0);
  await page.locator("#hero a[href='#presupuesto']").first().click();
  await page.waitForTimeout(2200);
  await jump(page, range!.start - 300);
  await page.waitForTimeout(1800);
  const filosofia = await page.locator("#filosofia h2").evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(filosofia).toBeGreaterThan(0.95);
});

test("ancla «Pide tu propuesta» → scroll suave y exacto a #presupuesto", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const samples: number[] = [];
  await page.locator("#hero a[href='#presupuesto']").first().click();
  for (let i = 0; i < 8; i++) {
    samples.push(await page.evaluate(() => window.scrollY));
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  // Suave: pasa por varias posiciones intermedias
  expect(new Set(samples.map((s) => Math.round(s / 50))).size).toBeGreaterThan(3);
  const top = await page.locator("#presupuesto").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(3);
  expect(page.url()).toContain("#presupuesto");
});

test("menú: bloquea el scroll, Esc lo cierra y lo libera", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Menú" }).click();
  await expect(page.locator("[data-site-menu]")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/scroll-locked/);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-site-menu]")).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);
});

test("navegación con cortinilla, vuelta atrás y sin fugas de ScrollTriggers", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await open(page);
  const count = () => page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.ScrollTrigger.getAll().length);
  const n0 = await count();

  await jump(page, 1800);
  // La cabecera se oculta al bajar (diseño): se sube un poco para que reaparezca, como haría una persona
  await page.mouse.wheel(0, -160);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Menú" }).click();
  await page.locator("[data-site-menu] a[href='/web']").click();
  await expect(page.locator(".rowe-curtain")).toBeVisible();
  await page.waitForURL("**/web");
  await expect(page.locator(".rowe-curtain")).toBeHidden({ timeout: 5000 });
  await expect(page.locator("[data-site-menu]")).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2); // arriba del todo
  await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);

  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForTimeout(800);
  expect(await count()).toBe(n0); // misma cantidad que al principio: nada duplicado ni huérfano
  expect(await pinRange(page, "estudio")).not.toBeNull();
  expect(errors).toEqual([]);
});

test("sin desbordes horizontales ni errores de consola", async ({ page }) => {
  await open(page);
  for (const y of [0, 1500, 4000, 8000, 14000]) {
    await jump(page, y);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test("móvil: sin pins, scroll nativo y carrusel horizontal independiente", async ({ page }, info) => {
  test.skip(isDesktop(info.project.name));
  await open(page);
  const pins = await page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.ScrollTrigger.getAll().filter((t) => t.pin).length);
  expect(pins).toBe(0);
  const carousel = page.locator("[data-carousel]");
  await carousel.scrollIntoViewIfNeeded();
  const { sw, cw } = await carousel.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  expect(sw).toBeGreaterThan(cw);
  await carousel.evaluate((el) => el.scrollBy({ left: 300 }));
  await page.waitForTimeout(400);
  expect(await carousel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
});

test("movimiento reducido: sin preloader, sin pins y todo legible", async ({ page }, info) => {
  test.skip(!isDesktop(info.project.name));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/", { intro: true });
  await expect(page.locator("[data-preloader]")).toBeHidden();
  const pins = await page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.ScrollTrigger.getAll().filter((t) => t.pin).length);
  expect(pins).toBe(0);
  const dim = await page.locator("[data-manifesto] [data-word]").evaluateAll((ws) => ws.filter((w) => Number(getComputedStyle(w).opacity) < 0.95).length);
  expect(dim).toBe(0);
});
