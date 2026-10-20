import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_TEXT, LEGAL_TEXT_ORIGINAL, LEGAL_TEXT_PLACE, pages } from "./seed-pages";

const page = (slug: string) => pages.find((p) => p.slug === slug)!;
const text = (slug: string) => (page(slug).blocks as { title: string; body: string }[]).map((b) => `${b.title}\n${b.body}`).join("\n");

/** Claves que la web guarda de verdad en el navegador (localStorage, sessionStorage y cookies), leídas del código. */
function storageKeysInCode(): string[] {
  const src = path.resolve(import.meta.dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !p.includes(`${path.sep}content${path.sep}`)) files.push(p);
    }
  };
  walk(src);
  const keys = new Set<string>();
  for (const file of files) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      // Constantes con el nombre de una clave y llamadas con la clave escrita en la propia línea
      if (!/(_KEY|_COOKIE)\s*=|Storage\.(setItem|getItem)\(\s*[`"']|draftKey\s*=/.test(line)) continue;
      for (const m of line.matchAll(/rowe[-:][a-z-]*:?/g)) keys.add(m[0].replace(/:$/, ":…"));
      if (line.includes("${CONSENT_KEY}-at")) keys.add("rowe-consent-at");
    }
  }
  return [...keys].sort();
}

describe("política de cookies = lo que hace el código", () => {
  const cookies = text("cookies");
  const inCode = storageKeysInCode();

  it("encuentra las claves del código", () => {
    expect(inCode).toEqual(expect.arrayContaining(["rowe-consent", "rowe-consent-at", "rowe-sid", "rowe:intro", "rowe:cfg", "rowe-remember", "rowe-admin:…", "rowe:reply:…"]));
  });

  it("cada clave del código está en la política", () => {
    for (const key of inCode) expect(cookies, key).toContain(key);
  });

  it("y la política no nombra ninguna clave que no exista", () => {
    const named = [...cookies.matchAll(/^(rowe[-:][a-z:-]*…?|sb-…-auth-token)/gm)].map((m) => m[1]);
    const inPanel = [...LEGAL_TEXT.cookiesPanel.matchAll(/rowe[-:][a-z-]*:…/g)].map((m) => m[0]);
    for (const key of [...named, ...inPanel]) if (key !== "sb-…-auth-token") expect(inCode, key).toContain(key);
    // La sesión de Supabase: cookie sb-<proyecto>-auth-token, hasta 400 días con «Recordarme»
    expect(cookies).toMatch(/sb-…-auth-token[^\n]*400 días/);
  });
});

describe("privacidad y aviso legal adaptados a ROWE", () => {
  it("el domicilio solo sale en el aviso legal, como domicilio a efectos legales y sin oficina abierta", () => {
    expect(text("aviso-legal")).toContain("Domicilio a efectos legales y de notificaciones: {domicilio}");
    expect(text("aviso-legal")).toContain("no tiene oficina abierta al público");
    for (const slug of ["privacidad", "cookies"]) expect(text(slug)).not.toContain("{domicilio}");
  });

  it("la privacidad nombra la ciudad, su finalidad y los proveedores reales", () => {
    const priv = text("privacidad");
    expect(priv).toMatch(/teléfono, ciudad, sector/);
    expect(priv).toMatch(/ciudad la usamos para valorar el desplazamiento del rodaje/);
    expect(priv).toContain("{alojamiento}");
    expect(priv).toMatch(/Supabase, con servidores en Frankfurt \(Alemania, Unión Europea\)/);
    expect(priv).toMatch(/Google \(Gmail\)/);
    expect(priv).toMatch(/Resend, cuando lo activemos/);
    expect(priv).toMatch(/Marco de Privacidad de Datos UE–EE\. UU\./);
  });

  it("sin IVA ni corchetes en los textos", () => {
    for (const slug of ["aviso-legal", "privacidad", "cookies"]) {
      expect(text(slug)).not.toMatch(/IVA|\[[^\]]*\]/);
    }
  });

  it("cada texto nuevo sustituye a un apartado que existe y es distinto del original", () => {
    for (const [key, place] of Object.entries(LEGAL_TEXT_PLACE) as [keyof typeof LEGAL_TEXT, { slug: string; title: string }][]) {
      const block = (page(place.slug).blocks as { title: string; body: string }[]).find((b) => b.title === place.title);
      expect(block?.body, key).toBe(LEGAL_TEXT[key]);
      expect(LEGAL_TEXT_ORIGINAL[key], key).not.toBe(LEGAL_TEXT[key]);
    }
  });
});
