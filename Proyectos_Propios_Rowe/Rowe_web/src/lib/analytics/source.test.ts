import { describe, expect, it } from "vitest";
import { classifySource } from "./source";

describe("origen de las visitas", () => {
  it.each([
    ["", "Directo"],
    ["https://l.instagram.com/?u=x", "Instagram"],
    ["https://www.google.es/", "Google"],
    ["https://www.tiktok.com/@rowe", "TikTok"],
    ["https://lnkd.in/abc", "LinkedIn"],
    ["http://localhost:3000/web", "Interno"],
    ["https://rowe-web.es/proyectos", "Interno"],
    ["https://otra-web.com", "Otros"],
    ["no es una url", "Otros"],
  ])("%s → %s", (ref, want) => {
    expect(classifySource(ref, "rowe-web.es")).toBe(want);
  });
});
