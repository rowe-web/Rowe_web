import { describe, expect, it } from "vitest";
import { spamHints } from "./spam";

describe("avisos de spam al responder", () => {
  it("un email normal no tiene avisos", () => {
    expect(spamHints("Tu proyecto con ROWE", "Hola Lucía:\n\nGracias por escribirnos. ¿Te viene bien una llamada el jueves?\n\nUn saludo,\nEl equipo de ROWE")).toEqual([]);
  });
  it("detecta mayúsculas, signos repetidos, palabras de publicidad, enlaces y asuntos vacíos", () => {
    expect(spamHints("OFERTA EXCLUSIVA", "Texto suficiente para no ser corto.").join(" ")).toMatch(/mayúsculas[\s\S]*oferta/);
    expect(spamHints("Hola", "¡¡Llámanos ya!! Es gratis")).toEqual(expect.arrayContaining([expect.stringMatching(/signos repetidos/), expect.stringMatching(/gratis/)]));
    expect(spamHints("", "Texto suficiente para no ser corto.")[0]).toMatch(/vacío/);
    expect(spamHints("Hola", "https://a.es https://b.es https://c.es y algo más de texto").join(" ")).toMatch(/enlaces/);
  });
});
