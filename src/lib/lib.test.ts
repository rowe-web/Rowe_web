import { describe, expect, it } from "vitest";
import { parseRich, plainText } from "./rich-text";
import { formatTimecode, timecodeFromScroll } from "./timecode";

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
