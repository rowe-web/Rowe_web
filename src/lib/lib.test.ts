import { describe, expect, it } from "vitest";
import { parseRich, plainText } from "./rich-text";
import { formatTimecode, timecodeFromScroll } from "./timecode";
import { inCategory, legalBlocks, pageBlocks } from "./content/blocks";
import { fillLegal } from "./content/settings";

describe("parseRich", () => {
  it("convierte *texto* en cursiva y \\n en salto de línea", () => {
    expect(parseRich("Que te vean.\nQue *confíen.*")).toEqual([
      { type: "text", value: "Que te vean." },
      { type: "br" },
      { type: "text", value: "Que " },
      { type: "em", value: "confíen." },
    ]);
  });

  it("no interpreta HTML", () => {
    expect(parseRich("<script>alert(1)</script>")).toEqual([{ type: "text", value: "<script>alert(1)</script>" }]);
  });

  it("deja un asterisco suelto como texto", () => {
    expect(plainText("Precio* orientativo")).toBe("Precio* orientativo");
  });

  it("plainText quita las marcas", () => {
    expect(plainText("Que te vean.\nQue *confíen.*\nQue te *elijan.*")).toBe("Que te vean. Que confíen. Que te elijan.");
  });
});

describe("timecode", () => {
  it("formatea a 25 fps", () => {
    expect(formatTimecode(0)).toBe("00:00:00:00");
    expect(formatTimecode(308)).toBe("00:00:12:08"); // valor del diseño
    expect(formatTimecode(25 * 3600 + 25 * 61 + 3)).toBe("01:01:01:03");
  });

  it("avanza con el scroll (1 fotograma cada 3 px) y nunca es negativo", () => {
    expect(timecodeFromScroll(75)).toBe("00:00:01:00");
    expect(timecodeFromScroll(-40)).toBe("00:00:00:00");
  });
});

describe("páginas internas: secciones y textos legales", () => {
  it("completa las secciones con su plantilla y descarta tipos desconocidos", () => {
    const blocks = pageBlocks([{ type: "preguntas", title: "FAQ" }, { type: "inventado" }, null, { title: "Legal", body: "x" }]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "preguntas", title: "FAQ", kicker: "", items: [{ q: "", a: "" }] });
  });

  it("separa los apartados legales de las secciones", () => {
    expect(legalBlocks([{ title: "Uno", body: "Texto" }, { type: "cierre", body: "no" }])).toEqual([{ title: "Uno", body: "Texto" }]);
  });

  it("«Web + Audiovisual» entra en los dos filtros", () => {
    expect(inCategory("Web + Audiovisual", "Web")).toBe(true);
    expect(inCategory("Web + Audiovisual", "Audiovisual")).toBe(true);
    expect(inCategory("Web", "Audiovisual")).toBe(false);
    expect(inCategory("Audiovisual", "")).toBe(true);
  });

  it("rellena las marcas legales y deja a la vista las que faltan", () => {
    const legal = { owner: "ROWE SL", nif: "B000", address: "", email: "a@b.es", hosting: "Vercel", updated: "hoy" };
    const out = fillLegal("{titular} ({nif}) · {domicilio} · {dominio} · {web} · {raro}", legal, { url: "https://ejemplo.es", host: "ejemplo.es" });
    expect(out).toBe("ROWE SL (B000) · {domicilio} · ejemplo.es · https://ejemplo.es · {raro}");
  });
});
