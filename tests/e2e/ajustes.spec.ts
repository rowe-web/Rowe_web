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

test("preloader: capa negra opaca por encima de toda la web mientras cuenta", async ({ page }) => {
  // En cuanto la web está pintada debajo, se mira qué elemento queda arriba en cada punto
  await page.addInitScript(() => {
    localStorage.setItem("rowe-consent", "denied");
    const w = window as unknown as { __cover?: { hits: boolean[]; bg: string } };
    const probe = () => {
      const pre = document.querySelector(".rowe-preloader");
      const header = document.querySelector("[data-site-header]");
      if (!pre || !header || !document.querySelector("#hero")) return requestAnimationFrame(probe);
      const pts: [number, number][] = [];
      for (const fx of [0.06, 0.3, 0.5, 0.7, 0.94]) for (const fy of [0.04, 0.3, 0.5, 0.75, 0.95]) pts.push([innerWidth * fx, innerHeight * fy]);
      for (const el of header.querySelectorAll("a, button")) {
        const r = el.getBoundingClientRect();
        if (r.width) pts.push([r.left + r.width / 2, r.top + r.height / 2]);
      }
      w.__cover = {
        hits: pts.map(([x, y]) => pre.contains(document.elementFromPoint(x, y))),
        bg: getComputedStyle(pre.querySelector("[data-preloader]")!).backgroundColor,
      };
    };
    requestAnimationFrame(probe);
  });
  await page.goto("/", { waitUntil: "commit" });
  const cover = await page.waitForFunction(() => (window as unknown as { __cover?: unknown }).__cover);
  const { hits, bg } = (await cover.jsonValue()) as { hits: boolean[]; bg: string };
  expect(hits.length).toBeGreaterThan(25);
  expect(hits.every(Boolean)).toBe(true);
  expect(bg).toBe("rgb(0, 0, 0)");
  // Y al terminar se retira y deja la web limpia
  await expect(page.locator(".rowe-preloader")).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator("#hero h1")).toBeVisible();
});

test("redimensionar o cambiar de pantalla: la web sigue donde estaba, con el configurador intacto", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await open(page);
  await page.evaluate(() => ((window as unknown as { __sinRecarga?: number }).__sinRecarga = 1));
  const sceneAtTop = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-scene]")]
        .find((s) => {
          const box = s.parentElement?.classList.contains("pin-spacer") ? s.parentElement : s;
          const r = box.getBoundingClientRect();
          return r.top <= 1 && r.bottom > 1;
        })
        ?.getAttribute("data-scene"),
    );
  const sizes = [
    { width: 1000, height: 800 }, // tablet
    { width: 700, height: 800 }, // móvil
    { width: 1440, height: 900 }, // vuelta a escritorio
    { width: 1440, height: 520 }, // otra altura (otro monitor)
    { width: 1440, height: 900 },
  ];

  // 1) A mitad de una escena con pin
  await page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo(2500, { immediate: true }));
  await page.waitForTimeout(800);
  const scene = await sceneAtTop();
  expect(scene).toBeTruthy();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(1200);
    expect(await sceneAtTop(), `${size.width}×${size.height}`).toBe(scene);
  }

  // 2) En el configurador, con opciones elegidas
  await page.locator("#presupuesto").scrollIntoViewIfNeeded();
  await page.evaluate(() => (window as unknown as { __rowe: RoweDebug }).__rowe.lenis.scrollTo("#rw-cfg", { immediate: true, offset: -100 }));
  await page.waitForTimeout(800);
  const cfg = page.locator("#rw-cfg");
  await cfg.getByRole("radio", { name: /Solo contenido/ }).click();
  await cfg.getByRole("radiogroup", { name: "Reels al mes" }).getByRole("radio", { name: "8" }).click();
  await expect(page.locator("#rw-monitor")).toContainText("+ 190 – 260 €/mes");
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(1200);
    await expect(cfg, `${size.width}×${size.height}`).toBeInViewport();
    await expect(cfg.getByRole("radio", { name: /Solo contenido/ })).toHaveAttribute("aria-checked", "true");
    await expect(cfg.getByRole("radiogroup", { name: "Reels al mes" }).getByRole("radio", { name: "8" })).toHaveAttribute("aria-checked", "true");
  }
  await expect(page.locator("#rw-monitor")).toContainText("+ 190 – 260 €/mes");
  // Nunca vuelve a salir la intro ni se recarga (la marca puesta al principio sigue ahí)
  await expect(page.locator(".rowe-preloader")).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: number }).__sinRecarga)).toBe(1);
  expect(errors).toEqual([]);
});

test("tras redimensionar o cambiar de pantalla, las animaciones siguen respondiendo al scroll (sin recargar)", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "escritorio");
  test.setTimeout(120_000);
  type Live = { __rowe: { ScrollTrigger: { getAll: () => { trigger?: Element; start: number; end: number; pin?: Element; vars: { scrub?: unknown } }[] } } };
  /** Disparadores ligados al scroll (scrub) o con pin: dónde empiezan y acaban */
  const triggers = (p: Page) =>
    p.evaluate(() =>
      (window as unknown as Live).__rowe.ScrollTrigger.getAll()
        .filter((t) => t.vars.scrub || t.pin)
        .map((t) => `${t.trigger?.closest("[data-scene]")?.getAttribute("data-scene")}:${Math.round(t.start)}-${Math.round(t.end)}`)
        .sort(),
    );
  const near = (a: string[], b: string[]) =>
    a.length === b.length &&
    a.every((x, i) => {
      const [ka, ra] = x.split(":");
      const [kb, rb] = b[i].split(":");
      const [sa, ea] = ra.split("-").map(Number);
      const [sb, eb] = rb.split("-").map(Number);
      return ka === kb && Math.abs(sa - sb) <= 3 && Math.abs(ea - eb) <= 3;
    });
  const webY = () => page.locator("[data-web-scroll]").first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  const headX = () => page.locator("[data-proceso-head]").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);

  await open(page);
  await page.evaluate(() => ((window as unknown as { __sinRecarga?: number }).__sinRecarga = 1));
  await jump(page, 3000);
  await page.waitForTimeout(800);
  // Ida y vuelta pasando por móvil (las escenas se rehacen dos veces) y otra pantalla más grande
  for (const [i, route] of [
    [{ width: 700, height: 800 }, { width: 1440, height: 900 }],
    [{ width: 1920, height: 1080 }],
  ].entries()) {
    for (const size of route) {
      await page.setViewportSize(size);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1500);
    const size = route[route.length - 1];
    const fresh = await browser.newPage({ viewport: size });
    await fresh.addInitScript(() => sessionStorage.setItem("rowe:intro", "1"));
    await fresh.goto("/", { waitUntil: "networkidle" });
    await fresh.waitForFunction(() => (window as unknown as { __rowe?: unknown }).__rowe);
    await fresh.waitForTimeout(1500);
    // Mismos puntos de activación que una carga limpia de ese tamaño
    const [mine, clean] = [await triggers(page), await triggers(fresh)];
    expect(near(mine, clean), `ruta ${i}: ${JSON.stringify({ mine, clean })}`).toBe(true);
    await fresh.close();
  }

  // Y responden: la página del visor (Escena 03) avanza al bajar y vuelve al subir
  await page.locator("[data-web-stage]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.mouse.move(700, 450);
  const y0 = await webY();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1200);
  const y1 = await webY();
  expect(y1).toBeLessThan(y0 - 20);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(1200);
  expect(Math.abs((await webY()) - y0)).toBeLessThan(8);
  // …y el cabezal de la línea de tiempo (Escena 06) también
  await page.locator("[data-proceso-timeline]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1000);
  const x0 = await headX();
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1200);
  expect(await headX()).toBeGreaterThan(x0 + 20);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1200);
  expect(Math.abs((await headX()) - x0)).toBeLessThan(8);
  // Sin recargar ni volver a la intro
  await expect(page.locator(".rowe-preloader")).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: number }).__sinRecarga)).toBe(1);
  expect(errors).toEqual([]);
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
    await expect.poll(() => page.locator(sel).evaluate((el) => Math.abs(Math.round(el.getBoundingClientRect().top))), { timeout: 8000 }).toBe(0);
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

test("preloader en móvil: se salta al tocar, libera el scroll y tiene red de seguridad sin JavaScript", async ({ page }, info) => {
  test.skip(info.project.name !== "movil");
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem("rowe-consent", "denied"));
  // Tocar en cuanto la página esté viva (la intro en móvil dura poco: no se espera a nada más)
  await page.addInitScript(() => {
    const iv = setInterval(() => {
      if ((window as unknown as { __roweMotion?: unknown }).__roweMotion) {
        clearInterval(iv);
        (window as unknown as { __readyAt: number }).__readyAt = performance.now();
      }
    }, 20);
  });
  await page.goto("/", { waitUntil: "commit" });
  const pre = page.locator(".rowe-preloader");
  await expect(pre).toBeAttached();
  await page.waitForFunction(() => (window as unknown as { __readyAt?: number }).__readyAt);
  // Red de seguridad CSS: aunque no cargara el JavaScript, se retiraría sola
  expect(await pre.evaluate((el) => getComputedStyle(el).animationName)).toMatch(/preloader-failsafe/);
  const t0 = Date.now();
  await page.touchscreen.tap(195, 420);
  await expect(pre).toHaveCount(0, { timeout: 1600 });
  expect(Date.now() - t0).toBeLessThan(1600);
  expect(await page.evaluate(() => document.documentElement.classList.contains("scroll-locked"))).toBe(false);
  await expect(page.locator("#hero h1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("pestaña en segundo plano: «ROWE en pausa — vuelve pronto» y al volver, el título real", async ({ page }) => {
  await open(page);
  const real = await page.title();
  const setHidden = (hidden: boolean) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: hidden ? "hidden" : "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await setHidden(true);
  expect(await page.title()).toBe("ROWE en pausa — vuelve pronto");
  // Un segundo aviso de salida no toma el título de pausa por el original
  await setHidden(true);
  await setHidden(false);
  expect(await page.title()).toBe(real);
  expect(real).not.toMatch(/en pausa/);
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
