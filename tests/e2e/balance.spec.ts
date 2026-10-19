import { expect, test, type Page } from "@playwright/test";

/**
 * Equilibrio web / audiovisual: preloader con código, Fig. 01 del proceso, vista
 * Escritorio / Móvil sincronizada en la escena 03, «Solo contenido» en el configurador
 * y el titular mixto de Hablemos. No escribe en la base de datos.
 */
type RoweDebug = { lenis: { scrollTo: (y: number | string | HTMLElement, o?: object) => void } };
const errors: string[] = [];

async function open(page: Page, { intro = false } = {}) {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript((intro) => {
    if (!intro) sessionStorage.setItem("rowe:intro", "1");
    localStorage.setItem("rowe-consent", "denied");
  }, intro);
  await page.goto("/", { waitUntil: intro ? "domcontentloaded" : "networkidle" });
  await page.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
}

const scrollTo = (page: Page, target: number | string) =>
  page.evaluate((t) => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(t, { immediate: true, force: true }), target);

test("preloader: etiqueta de código < ROWE /> y registro de build que avanza", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await open(page, { intro: true });
  const pre = page.locator("[data-preloader]");
  await expect(pre).toBeVisible();
  await expect(pre).toContainText("<");
  await expect(pre).toContainText("/>");
  await expect(pre.locator("[data-preloader-step]")).toContainText("›");
  await expect(pre).toContainText("WE · Build");
  await expect(page.locator(".rowe-preloader")).toHaveCount(0, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test("hero: Fig. 01 es la animación del proceso (web → contenido → tráfico)", async ({ page }, info) => {
  await open(page);
  if (info.project.name === "escritorio") await expect(page.locator("#hero figure figcaption").first()).toContainText("Proceso ROWE");
  // La animación visible en cada anchura (escritorio: a la derecha del titular; móvil: junto al texto)
  for (const word of ["Web", "Contenido", "Tráfico"]) {
    await expect(page.locator("#hero").getByText(new RegExp(`· ${word}$`)).filter({ visible: true }).first()).toBeAttached();
  }
  await expect(page.locator("#hero")).not.toContainText("Rodaje en clínica");
});

test("escena 03: selector Escritorio / Móvil con el scroll sincronizado", async ({ page }) => {
  await open(page);
  const scene = page.locator("#web");
  await expect(scene).not.toContainText(/sustituir/i);
  const desktop = scene.getByRole("radio", { name: "Escritorio" });
  const mobile = scene.getByRole("radio", { name: "Móvil" });
  await expect(desktop).toHaveAttribute("aria-checked", "true");

  // A mitad de la escena
  const top = await scene.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollTo(page, top + 200);
  await page.waitForTimeout(900);
  await mobile.click();
  await expect(mobile).toHaveAttribute("aria-checked", "true");
  await expect(scene.locator("figcaption")).toContainText("390 × 844");
  await page.waitForTimeout(900);
  await expect(scene.locator("[data-web-view='mobile']")).toHaveCSS("opacity", "1");
  await expect(scene.locator("[data-web-view='desktop']")).toHaveCSS("opacity", "0");

  // Las dos páginas avanzan con la misma fracción de su recorrido
  const progress = () =>
    scene.evaluate((root) =>
      [...root.querySelectorAll<HTMLElement>("[data-web-scroll]")].map((p) => {
        const dist = Math.max(1, p.scrollHeight - p.parentElement!.clientHeight * 0.92);
        return -new DOMMatrix(getComputedStyle(p).transform).m42 / dist;
      }),
    );
  await scrollTo(page, top + 520);
  await page.waitForTimeout(1200);
  const [d, m] = await progress();
  expect(d).toBeGreaterThan(0.05);
  expect(Math.abs(d - m)).toBeLessThan(0.02);

  await desktop.click();
  await expect(desktop).toHaveAttribute("aria-checked", "true");
  await expect(scene.locator("figcaption")).toContainText("1440 × 900");
  expect(errors).toEqual([]);
});

test("configurador: «Solo contenido» presupuesta solo el rodaje y bloquea lo que es de web", async ({ page }) => {
  await open(page);
  await scrollTo(page, "#presupuesto");
  const cfg = page.locator("#rw-cfg");
  const monitor = page.locator("#rw-monitor");
  await cfg.getByRole("radio", { name: /Solo contenido/ }).click();
  await expect(monitor).toContainText("150 – 200 €");
  await expect(monitor).toContainText("Rodaje vertical 9:16");
  await expect(cfg).toContainText("Sin web, de momento.");
  await expect(cfg.getByRole("switch", { name: /Mantenimiento/ })).toBeDisabled();

  // Los reels se pueden añadir sin web
  await cfg.getByRole("radiogroup", { name: "Reels al mes" }).getByRole("radio", { name: "8" }).click();
  await expect(monitor).toContainText("+ 190 – 260 €/mes");

  // «Enviar y hablemos» precarga «Audiovisual»
  await page.getByRole("button", { name: /Enviar y hablemos/ }).click();
  const overlay = page.getByRole("dialog", { name: "Hablemos" });
  await expect(overlay.getByRole("radio", { name: "Audiovisual", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();

  // «Añadir web» pasa a «Web + contenido» y conserva los reels
  await cfg.getByRole("button", { name: /Añadir web/ }).click();
  await expect(cfg.getByRole("radio", { name: /Web \+ contenido/ })).toHaveAttribute("aria-checked", "true");
  await expect(cfg.getByRole("switch", { name: /Mantenimiento/ })).toBeEnabled();
  await expect(monitor).toContainText("850 – 1.300 €");
  expect(errors).toEqual([]);
});

test("hablemos: titular mixto web + audiovisual", async ({ page }) => {
  await open(page);
  await expect(page.locator("#hablemos h2").first()).toContainText("¿Empezamos tu próximo proyecto?");
  await expect(page.locator("body")).not.toContainText("¿Grabamos tu próxima escena?");
});
