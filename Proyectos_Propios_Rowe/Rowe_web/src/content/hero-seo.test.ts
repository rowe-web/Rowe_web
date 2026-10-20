import { describe, expect, it } from "vitest";
import { plainText } from "@/lib/rich-text";
import { buildFallbackSnapshot } from "./fallback";
import { HERO_TEXT, HOME_SEO } from "./seed-data";

describe("hero: frase de posicionamiento", () => {
  const hero = buildFallbackSnapshot().scenes.find((s) => s.key === "hero")!;

  it("el contenido inicial trae la frase, con cursiva, y el h1 sigue siendo el eslogan", () => {
    expect(hero.data.claim).toBe("Diseñamos *webs a medida* para negocios de toda España y grabamos su contenido en el Camp de Tarragona.");
    expect(hero.title).toContain("Que te vean.");
  });

  it("el texto de debajo es corto y no repite la frase", () => {
    expect(hero.body).toBe(HERO_TEXT.body);
    expect(hero.body.length).toBeLessThan(plainText(HERO_TEXT.claim).length);
    expect(hero.body).not.toMatch(/toda España|Camp de Tarragona|webs a medida/);
  });
});

describe("SEO de la home", () => {
  const seo = buildFallbackSnapshot().settings.seo as { title: string; description: string };

  it("el título dice qué hacemos", () => {
    expect(seo.title).toBe("ROWE — Diseño web a medida y vídeo para empresas");
    expect(seo.title).toBe(HOME_SEO.title);
  });

  it("la descripción mide 140–155 caracteres y nombra webs para toda España y vídeo en el Camp de Tarragona", () => {
    expect(seo.description.length).toBeGreaterThanOrEqual(140);
    expect(seo.description.length).toBeLessThanOrEqual(155);
    expect(seo.description).toMatch(/[Ww]ebs.*toda España/);
    expect(seo.description).toMatch(/vídeo.*Camp de Tarragona/);
  });
});
