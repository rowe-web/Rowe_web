import { describe, expect, it } from "vitest";
import { buildFallbackSnapshot } from "@/content/fallback";
import { SERVICE_AREA } from "@/content/seed-data";
import { emptyContact, hasRealValue, instagramHref, mailtoHref, serviceCities, telHref, videoAreaText, whatsappHref, type ContactSettings } from "./content/settings";
import { organizationLd, serviceLd } from "./seo";

const contact = (over: Partial<ContactSettings> = {}): ContactSettings => ({ ...emptyContact, ...SERVICE_AREA, ...over });

describe("hasRealValue", () => {
  it("descarta lo vacío y lo provisional", () => {
    for (const v of ["", "   ", "[+34 600 000 000]", "Reus [por confirmar]", null, undefined, 3]) expect(hasRealValue(v)).toBe(false);
  });
  it("acepta un dato real", () => {
    for (const v of ["+34 611 222 333", "hola@rowe.es", "Tarragona"]) expect(hasRealValue(v)).toBe(true);
  });
});

describe("enlaces de contacto", () => {
  it("sin dato real no hay enlace", () => {
    for (const fn of [whatsappHref, telHref, mailtoHref, instagramHref]) {
      expect(fn("")).toBe("");
      expect(fn("[+34 600 000 000]")).toBe("");
    }
  });
  it("con dato real, el enlace correcto", () => {
    expect(telHref("+34 611 22 33 44")).toBe("tel:+34611223344");
    expect(whatsappHref("+34 611 22 33 44")).toBe("https://wa.me/34611223344");
    expect(mailtoHref(" hola@rowe.es ")).toBe("mailto:hola@rowe.es");
    expect(instagramHref("@rowe.estudio")).toBe("https://instagram.com/rowe.estudio");
  });
});

describe("dónde trabajamos", () => {
  it("rodajes con las ciudades separadas por «·»", () => {
    expect(videoAreaText(contact())).toBe("Rodajes en el Camp de Tarragona: Tarragona · Reus · Salou · Cambrils · Vila-seca");
  });
  it("sin ciudades reales, solo el texto; sin nada, vacío", () => {
    expect(serviceCities(contact({ service_area_cities: ["", "[Ciudad]", " Reus "] }))).toEqual(["Reus"]);
    expect(videoAreaText(contact({ service_area_cities: [] }))).toBe("Rodajes en el Camp de Tarragona");
    expect(videoAreaText(emptyContact)).toBe("");
  });
  it("el contenido inicial ya trae la zona de trabajo y la ciudad de la marca es real", () => {
    const site = buildFallbackSnapshot();
    expect(site.settings.contact).toMatchObject(SERVICE_AREA);
    expect(hasRealValue(site.settings.brand.city)).toBe(true);
  });
});

describe("datos estructurados", () => {
  it("sin dirección ni teléfono reales, no los publica; zona: España", () => {
    const ld = organizationLd(buildFallbackSnapshot());
    expect(ld.address).toBeUndefined();
    expect(ld.telephone).toBeUndefined();
    expect(ld.areaServed).toEqual({ "@type": "Country", name: "España" });
  });

  it("con dirección real sí la publica", () => {
    const site = buildFallbackSnapshot();
    site.settings.contact = { ...site.settings.contact, address: "Calle Mayor 1, Reus" };
    expect(organizationLd(site).address).toMatchObject({ "@type": "PostalAddress", streetAddress: "Calle Mayor 1, Reus" });
  });

  it("web para toda España; audiovisual, las ciudades de la provincia de Tarragona", () => {
    const site = buildFallbackSnapshot();
    expect(serviceLd(site, "web", "web").areaServed).toEqual({ "@type": "Country", name: "España" });
    const area = serviceLd(site, "audiovisual", "audiovisual").areaServed;
    expect(area).toHaveLength(5);
    expect(area).toContainEqual({ "@type": "City", name: "Reus", containedInPlace: { "@type": "AdministrativeArea", name: "Provincia de Tarragona" } });
  });
});
