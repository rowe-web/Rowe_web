import { describe, expect, it } from "vitest";
import { buildFallbackSnapshot } from "@/content/fallback";
import { computeQuote, defaultSelection, needFromSelection, normalizeSelection, quoteLabel, type Selection } from "./engine";
import { delta, range } from "./format";

const config = buildFallbackSnapshot().configurator;

/**
 * ORÁCULO: función compute() copiada tal cual de design/ROWE Presupuesto.dc.html,
 * con las tarifas vigentes (las del diseño con la bajada general del 20 %, octubre de 2026). El motor, que lee los precios de la base de datos, debe dar
 * exactamente los mismos resultados en todas las combinaciones.
 */
const PR = {
  type: {
    nueva: { title: "Web nueva", r: [720, 1120], w: [3, 4] },
    rediseno: { title: "Rediseño", r: [560, 880], w: [2, 3] },
    contenido: { title: "Web + contenido", r: [1000, 1520], w: [4, 5] },
  } as Record<string, { title: string; r: number[]; w: number[] }>,
  pages: {
    "1": { l: "Landing · 1 página", r: [-240, -360], w: -1 },
    "5": { l: "Hasta 5 páginas", r: [0, 0], w: 0 },
    "10": { l: "Hasta 10 páginas", r: [320, 480], w: 1 },
    "10+": { l: "Más de 10", r: [720, 1120], w: 2 },
  } as Record<string, { l: string; r: number[]; w: number }>,
  reservas: [240, 400], tienda: [720, 1200], seo: [200, 320], idioma: [160, 240],
  fotos: [200, 320], video: [480, 880], reels: { 0: [0, 0], 4: [210, 290], 8: [380, 510], 12: [540, 720] } as Record<number, number[]>, mant: [30, 50],
};
const r50 = (n: number) => Math.round(n / 50) * 50;
type S = { type: string; pages: string; reservas: boolean; tienda: boolean; seo: boolean; idiomas: number; reels: number; fotos: boolean; video: boolean; mant: boolean; urgente: boolean };
function designCompute(s: S) {
  const items: { t: string; l: string; r: number[]; m?: boolean }[] = [];
  const T = PR.type[s.type], pg = PR.pages[s.pages];
  if (s.type === "contenido") {
    items.push({ t: "WE", l: "Web a medida" + (s.pages === "1" ? " · landing" : ""), r: [720 + (s.pages === "1" ? pg.r[0] : 0), 1120 + (s.pages === "1" ? pg.r[1] : 0)] });
    items.push({ t: "RO", l: "Jornada de rodaje", r: [280, 400] });
  } else items.push({ t: "WE", l: T.title + (s.pages === "1" ? " · landing" : ""), r: [T.r[0] + (s.pages === "1" ? pg.r[0] : 0), T.r[1] + (s.pages === "1" ? pg.r[1] : 0)] });
  if (s.pages === "10" || s.pages === "10+") items.push({ t: "WE", l: pg.l, r: pg.r });
  if (s.reservas) items.push({ t: "WE", l: "Reservas / citas", r: PR.reservas });
  if (s.tienda) items.push({ t: "WE", l: "Tienda online", r: PR.tienda });
  if (s.seo) items.push({ t: "WE", l: "SEO local", r: PR.seo });
  if (s.idiomas > 1) items.push({ t: "WE", l: `Idiomas ×${s.idiomas - 1}`, r: PR.idioma.map((v) => v * (s.idiomas - 1)) });
  if (s.type === "contenido") {
    if (s.fotos) items.push({ t: "RO", l: "Sesión de fotos", r: PR.fotos });
    if (s.video) items.push({ t: "RO", l: "Vídeo corporativo", r: PR.video });
    if (s.reels) items.push({ t: "RO", l: `${s.reels} reels/mes`, r: PR.reels[s.reels], m: true });
  }
  if (s.mant) items.push({ t: "WE", l: "Mantenimiento", r: PR.mant, m: true });
  let one = [0, 0], mon = [0, 0];
  items.forEach((i) => { const tgt = i.m ? mon : one; tgt[0] += i.r[0]; tgt[1] += i.r[1]; });
  if (s.urgente) { const u = [one[0] * 0.2, one[1] * 0.2]; items.push({ t: "WE", l: "Entrega urgente", r: u }); one = [one[0] + u[0], one[1] + u[1]]; }
  one = one.map(r50); mon = mon.map((v) => Math.round(v / 10) * 10);
  let w = [T.w[0] + pg.w, T.w[1] + pg.w];
  if (s.tienda) w = [w[0] + 2, w[1] + 2];
  if (s.reservas) w = [w[0], w[1] + 1];
  if (s.video) w = [w[0], w[1] + 1];
  w = w.map((v) => Math.max(1, v));
  if (s.urgente) w = w.map((v) => Math.max(1, Math.ceil(v * 0.6)));
  return { items, one, mon, w };
}

const pageKey: Record<string, string> = { "1": "landing", "5": "p5", "10": "p10", "10+": "p10p" };
function toSelection(s: S): Selection {
  return {
    tipo: s.type, paginas: pageKey[s.pages], reservas: s.reservas, tienda: s.tienda, seo: s.seo, idiomas: s.idiomas,
    reels: `reels${s.reels}`, fotos: s.fotos, video: s.video, mant: s.mant, urgente: s.urgente,
  };
}

describe("motor de precios", () => {
  it("sin tipo elegido no hay presupuesto (estado «Standby»)", () => {
    expect(computeQuote(config, defaultSelection(config))).toBeNull();
  });

  it("coincide con el cálculo del diseño en TODAS las combinaciones", () => {
    let checked = 0;
    const bools = [false, true];
    for (const type of ["nueva", "rediseno", "contenido"])
      for (const pages of ["1", "5", "10", "10+"])
        for (const reservas of bools) for (const tienda of bools) for (const seo of bools)
          for (const idiomas of [1, 2, 3, 4]) for (const reels of [0, 4, 8, 12])
            for (const fotos of bools) for (const video of bools) for (const mant of bools) for (const urgente of bools) {
              // En la interfaz, el bloque audiovisual solo es pulsable con «Web + contenido»
              if (type !== "contenido" && (fotos || video || reels)) continue;
              const s: S = { type, pages, reservas, tienda, seo, idiomas, reels, fotos, video, mant, urgente };
              const want = designCompute(s);
              const got = computeQuote(config, toSelection(s))!;
              expect(got.one).toEqual(want.one);
              expect(got.monthly).toEqual(want.mon);
              expect(got.weeks).toEqual(want.w);
              const norm = (xs: { label: string; min: number; max: number }[]) => xs.map((x) => `${x.label}|${Math.round(x.min)}|${Math.round(x.max)}`).sort();
              expect(norm(got.items)).toEqual(norm(want.items.map((i) => ({ label: i.l, min: i.r[0], max: i.r[1] }))));
              checked++;
            }
    expect(checked).toBe(3 * 4 * 8 * 4 * 2 * 2 + 1 * 4 * 8 * 4 * 4 * 2 * 2 * 2 * 2 - 1 * 4 * 8 * 4 * 2 * 2);
  });

  it("niveles y medidor como en el diseño", () => {
    const q = computeQuote(config, toSelection({ type: "nueva", pages: "5", reservas: true, tienda: false, seo: true, idiomas: 1, reels: 0, fotos: false, video: false, mant: false, urgente: false }))!;
    expect(q.one).toEqual([1150, 1850]); // simulación A del panel
    expect(q.level).toBe("Completo");
    expect(q.lit).toBe(Math.round((1850 / 4480) * 28));
    expect(quoteLabel(q)).toBe("1.150 – 1.850 €");
  });

  it("sanea selecciones manipuladas desde el navegador", () => {
    const sel = normalizeSelection(config, { tipo: "gratis", idiomas: 99, tienda: "sí", hack: true, reels: "reels8" });
    expect(sel.tipo).toBeUndefined();
    expect(sel.idiomas).toBe(4); // acotado al máximo configurado
    expect(sel.tienda).toBe(false);
    expect(sel.hack).toBeUndefined();
    expect(sel.reels).toBe("reels8");
    // Con un tipo que no es «Web + contenido», los reels no cuentan aunque lleguen marcados
    const q = computeQuote(config, { ...normalizeSelection(config, { tipo: "nueva", reels: "reels12" }) })!;
    expect(q.monthly).toEqual([0, 0]);
  });

  it("«Solo contenido»: presupuesta solo el rodaje, sin web", () => {
    const q = computeQuote(config, { ...defaultSelection(config), tipo: "redes" })!;
    expect(q.items.map((i) => [i.label, i.track])).toEqual([["Rodaje para redes", "RO"]]);
    expect(q.one).toEqual([300, 400]); // 280 – 400 €, redondeado de 50 en 50
    expect(q.monthly).toEqual([0, 0]);
    expect(q.weeks).toEqual([1, 2]);
    expect(needFromSelection(config, { tipo: "redes" })).toBe("Audiovisual");
    expect(needFromSelection(config, { tipo: "contenido" })).toBe("Las dos cosas");
    expect(needFromSelection(config, { tipo: "nueva" })).toBe("Web");
  });

  it("«Solo contenido» suma reels, fotos y vídeo, e ignora todo lo que es de web", () => {
    const web = { paginas: "landing", tienda: true, reservas: true, seo: true, idiomas: 3, mant: true };
    const q = computeQuote(config, normalizeSelection(config, { tipo: "redes", reels: "reels8", fotos: true, video: true, ...web }))!;
    expect(q.items.every((i) => i.track === "RO")).toBe(true);
    expect(q.one).toEqual([950, 1600]); // 280 + 200 + 480 = 960 → 950 · 400 + 320 + 880
    expect(q.monthly).toEqual([380, 510]);
    expect(q.weeks).toEqual([1, 3]); // vídeo corporativo: +0 / +1
    expect(quoteLabel(q)).toBe("950 – 1.600 € + 380 – 510 €/mes");
    // Entrega urgente sí aplica (+20 % y plazo ×0,6)
    const u = computeQuote(config, { tipo: "redes", urgente: true })!;
    expect(u.one).toEqual([350, 500]); // 336 – 480 €, redondeado
    expect(u.weeks).toEqual([1, 2]);
  });

  it("formato de precios", () => {
    expect(range(1250, 1900)).toBe("1.250 – 1.900 €");
    expect(delta(-300, -450, "once")).toBe("−300 – 450 €");
    expect(delta(0, 0, "once")).toBe("Incluido");
    expect(delta(35, 60, "monthly", "/mes")).toBe("+35 – 60 €/mes");
    expect(delta(20, 20, "percent_once")).toBe("+20 %");
  });
});
