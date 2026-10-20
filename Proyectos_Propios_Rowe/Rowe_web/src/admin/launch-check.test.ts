import { describe, expect, it } from "vitest";
import { buildFallbackSnapshot } from "@/content/fallback";
import type { SiteSnapshot } from "@/lib/content/types";
import { isValidSocial, launchIssues } from "./launch-check";

/** El contenido inicial con todo lo provisional ya sustituido. */
function cleanSnapshot(): SiteSnapshot {
  const site = buildFallbackSnapshot();
  site.settings.contact = { ...site.settings.contact, phone: "+34 611 222 333", whatsapp: "+34 611 222 333", address: "Valencia, Valencia" };
  site.settings.brand = { ...site.settings.brand, city: "Valencia" };
  site.settings.hablemos = { ...site.settings.hablemos, fields: { ...(site.settings.hablemos.fields as object), phone_placeholder: "+34 600 000 000" } };
  site.settings.legal = { ...site.settings.legal, owner: "ROWE Estudio S.L.", nif: "B12345678", address: "Calle Mayor 1, 46001 Valencia", hosting: "Vercel Inc." };
  site.settings.configurator = { ...site.settings.configurator, disclaimer: "Precios orientativos. IVA no incluido." };
  site.projects = site.projects.map((p) => ({ ...p, is_placeholder: false, cover_id: `cover-${p.slug}` }));
  site.scenes = site.scenes.map((s) => (s.key === "hero" ? { ...s, media_id: "showreel" } : s));
  for (const slug of ["web", "audiovisual"]) {
    site.pages[slug] = { ...site.pages[slug], blocks: site.pages[slug].blocks.map((b) => ((b as { type?: string }).type === "cabecera" ? { ...(b as object), image_media_id: `cabecera-${slug}` } : b)) };
  }
  return site;
}

describe("launchIssues", () => {
  it("con el contenido inicial detecta lo provisional", () => {
    const issues = launchIssues(buildFallbackSnapshot());
    const ids = issues.map((i) => i.id);
    const blocking = issues.filter((i) => i.severity === "bloqueante").map((i) => i.id);

    // Proyectos de ejemplo publicados, y sin portada
    expect(blocking).toContain("project-sample:project-clinica-dental-mar");
    expect(ids).toContain("project-cover:project-clinica-dental-mar");
    // Teléfono provisional
    const phone = issues.find((i) => i.id === "provisional:settings.contact:phone")!;
    expect(phone).toMatchObject({ severity: "bloqueante", href: "/admin/ajustes?tab=contacto" });
    expect(phone.detail).toContain("[+34 600 000 000]");
    // Aviso de precios de ejemplo del configurador
    expect(issues.find((i) => i.id === "configurator-disclaimer")).toMatchObject({ severity: "bloqueante", href: "/admin/ajustes?tab=configurador" });
    // Hero sin showreel y cabeceras sin imagen
    expect(ids).toEqual(expect.arrayContaining(["hero-showreel", "page-header:web", "page-header:audiovisual"]));
    // Los bloqueantes van primero
    expect(issues.findIndex((i) => i.severity === "aviso")).toBe(blocking.length);
  });

  it("enlaza cada proyecto a su ficha", () => {
    const issue = launchIssues(buildFallbackSnapshot()).find((i) => i.id === "project-sample:project-clinica-dental-mar")!;
    expect(issue.href).toBe("/admin/proyectos/project-clinica-dental-mar");
  });

  it("sin nada provisional no hay avisos", () => {
    expect(launchIssues(cleanSnapshot())).toEqual([]);
  });

  it("los datos legales vacíos bloquean", () => {
    const site = cleanSnapshot();
    site.settings.legal = { ...site.settings.legal, nif: "  ", hosting: "" };
    expect(launchIssues(site).map((i) => [i.id, i.severity])).toEqual([
      ["legal-empty:nif", "bloqueante"],
      ["legal-empty:hosting", "bloqueante"],
    ]);
  });

  it("detecta corchetes en escenas y páginas", () => {
    const site = cleanSnapshot();
    site.scenes = site.scenes.map((s) => (s.key === "estudio" ? { ...s, body: "Estamos en [ciudad]" } : s));
    site.pages.contacto = { ...site.pages.contacto, intro: "Llámanos al [teléfono]" };
    const issues = launchIssues(site);
    expect(issues.find((i) => i.id === "provisional:scene.estudio:body")).toMatchObject({ href: "/admin/textos?escena=estudio", severity: "bloqueante" });
    expect(issues.find((i) => i.id === "provisional:page.contacto:intro")).toMatchObject({ href: "/admin/ajustes?tab=paginas" });
  });

  it("avisa de redes que no son un usuario ni una dirección", () => {
    const site = cleanSnapshot();
    site.settings.contact = { ...site.settings.contact, instagram: "mi instagram", youtube: "" };
    expect(launchIssues(site)).toEqual([expect.objectContaining({ id: "social:instagram", severity: "aviso" })]);
  });
});

describe("isValidSocial", () => {
  it("acepta usuarios y direcciones", () => {
    for (const v of ["@rowe.estudio", "rowe", "linkedin.com/company/rowe", "https://youtube.com/@rowe"]) expect(isValidSocial(v)).toBe(true);
  });
  it("rechaza textos sueltos", () => {
    for (const v of ["mi instagram", "@", "http://", "rowe en youtube"]) expect(isValidSocial(v)).toBe(false);
  });
});
