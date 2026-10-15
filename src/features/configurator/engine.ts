import type { ConfigOption, ConfigSection, Requirement, Track } from "@/lib/content/types";
import { range } from "./format";

/**
 * Motor de precios del configurador — función PURA, idéntica en navegador y servidor.
 * El servidor nunca se fía del precio que manda el navegador: recalcula con esto y con
 * los precios de la versión publicada.
 *
 * Reglas (todas salen de la base de datos, editables desde el panel):
 *  - Opción base (is_base, p. ej. «Web nueva»): sin base elegida no hay presupuesto.
 *    Si tiene `components`, se desglosa en varias líneas (Web a medida + Jornada de rodaje).
 *  - `modifies_base` (p. ej. «Landing»): suma su precio a la línea base y añade `base_suffix`.
 *  - Elección única (card/segment, mismo set_key): una línea salvo que valga 0 – 0 («Incluido», «No»).
 *  - Interruptor (toggle): una línea si está activo.
 *  - Contador (stepper): cuenta solo lo que pasa de `stepper_included`; «{n}» en la etiqueta = esa cantidad.
 *  - `price_mode`: once (pago único) · monthly (al mes) · percent_once (% sobre el pago único, al final).
 *  - `requires` (en la opción o su sección): solo cuenta si se cumple (p. ej. audiovisual ⇢ «Web + contenido»).
 *  - Plazo: semanas de la base + incrementos; mínimo `min_weeks`; luego `weeks_factor` (urgente ×0,6, redondeo arriba).
 *  - Redondeo: pago único a `round_once` (50 €), mensual a `round_monthly` (10 €).
 */

export type Selection = Record<string, string | boolean | number>;

export interface Config {
  sections: ConfigSection[];
  options: ConfigOption[];
}

export interface EngineSettings {
  round_once: number;
  round_monthly: number;
  min_weeks: number;
  levels: { below: number | null; label: string }[];
  vu_bars: number;
  vu_max: number;
}

export const defaultEngineSettings: EngineSettings = {
  round_once: 50,
  round_monthly: 10,
  min_weeks: 1,
  levels: [
    { below: 1800, label: "Esencial" },
    { below: 3600, label: "Completo" },
    { below: null, label: "A medida" },
  ],
  vu_bars: 28,
  vu_max: 5600,
};

export interface QuoteItem {
  key: string;
  label: string;
  track: Track;
  min: number;
  max: number;
  monthly: boolean;
}

export interface Quote {
  items: QuoteItem[];
  one: [number, number];
  monthly: [number, number];
  weeks: [number, number];
  level: string;
  /** Barras encendidas del medidor (de vu_bars). */
  lit: number;
}

// ---------------------------------------------------------------------------
// Selección
// ---------------------------------------------------------------------------

/** Orden estable: secciones por posición, opciones por posición dentro de su sección. */
export function orderedOptions(config: Config): ConfigOption[] {
  const sectionPos = new Map(config.sections.map((s) => [s.key, s.position]));
  return [...config.options].sort(
    (a, b) => (sectionPos.get(a.section_key) ?? 0) - (sectionPos.get(b.section_key) ?? 0) || a.position - b.position,
  );
}

export function defaultSelection(config: Config): Selection {
  const sel: Selection = {};
  for (const o of config.options) {
    if (o.control === "card" || o.control === "segment") {
      if (o.set_key && o.is_default) sel[o.set_key] = o.key;
    } else if (o.control === "toggle") {
      sel[o.key] = false;
    } else if (o.control === "stepper") {
      sel[o.key] = o.stepper_included ?? o.stepper_min ?? 0;
    }
  }
  return sel;
}

/**
 * Limpia una selección que llega de fuera (navegador): ignora claves desconocidas,
 * descarta valores imposibles y acota los contadores. Nunca lanza.
 */
export function normalizeSelection(config: Config, raw: unknown): Selection {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sel = defaultSelection(config);
  const sets = new Map<string, Set<string>>();
  for (const o of config.options) {
    if ((o.control === "card" || o.control === "segment") && o.set_key) {
      if (!sets.has(o.set_key)) sets.set(o.set_key, new Set());
      sets.get(o.set_key)!.add(o.key);
    }
  }
  for (const [set, keys] of sets) {
    const v = input[set];
    if (typeof v === "string" && keys.has(v)) sel[set] = v;
  }
  for (const o of config.options) {
    const v = input[o.key];
    if (o.control === "toggle" && typeof v === "boolean") sel[o.key] = v;
    if (o.control === "stepper" && typeof v === "number" && Number.isFinite(v)) {
      const min = o.stepper_min ?? 0;
      const max = o.stepper_max ?? min;
      sel[o.key] = Math.min(max, Math.max(min, Math.round(v)));
    }
  }
  return sel;
}

export function requirementMet(req: Requirement | null | undefined, sel: Selection): boolean {
  if (!req) return true;
  const v = sel[req.set];
  return typeof v === "string" && req.in.includes(v);
}

/** ¿Está disponible la opción (su sección y ella misma cumplen sus requisitos)? */
export function isAvailable(config: Config, o: ConfigOption, sel: Selection): boolean {
  const section = config.sections.find((s) => s.key === o.section_key);
  return requirementMet(section?.requires, sel) && requirementMet(o.requires, sel);
}

function isSelected(o: ConfigOption, sel: Selection): boolean {
  if (o.control === "card" || o.control === "segment") return !!o.set_key && sel[o.set_key] === o.key;
  if (o.control === "toggle") return sel[o.key] === true;
  if (o.control === "stepper") return extraUnits(o, sel) > 0;
  return false;
}

function extraUnits(o: ConfigOption, sel: Selection): number {
  const n = typeof sel[o.key] === "number" ? (sel[o.key] as number) : (o.stepper_included ?? 0);
  return Math.max(0, n - (o.stepper_included ?? o.stepper_min ?? 0));
}

const roundTo = (n: number, step: number) => (step > 0 ? Math.round(n / step) * step : Math.round(n));

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

export function computeQuote(config: Config, sel: Selection, settings: EngineSettings = defaultEngineSettings): Quote | null {
  const opts = orderedOptions(config);
  const available = (o: ConfigOption) => isAvailable(config, o, sel);
  const base = opts.find((o) => o.is_base && available(o) && isSelected(o, sel));
  if (!base) return null;

  const modifiers = opts.filter((o) => o.modifies_base && available(o) && isSelected(o, sel));
  const modMin = modifiers.reduce((a, m) => a + m.price_min, 0);
  const modMax = modifiers.reduce((a, m) => a + m.price_max, 0);
  const suffix = modifiers.map((m) => m.base_suffix).join("");

  const items: QuoteItem[] = [];
  if (base.components?.length) {
    base.components.forEach((c, i) =>
      items.push({
        key: `${base.key}:${i}`,
        label: c.label + (c.base ? suffix : ""),
        track: c.track,
        min: c.min + (c.base ? modMin : 0),
        max: c.max + (c.base ? modMax : 0),
        monthly: false,
      }),
    );
  } else {
    items.push({
      key: base.key,
      label: (base.line_label || base.label) + suffix,
      track: base.track,
      min: base.price_min + modMin,
      max: base.price_max + modMax,
      monthly: false,
    });
  }

  const percent: ConfigOption[] = [];
  for (const o of opts) {
    if (o.is_base || o.modifies_base || !available(o) || !isSelected(o, sel)) continue;
    if (o.price_mode === "percent_once") {
      percent.push(o);
      continue;
    }
    if (o.control === "stepper") {
      const n = extraUnits(o, sel);
      items.push({
        key: o.key,
        label: (o.line_label || o.label).replace("{n}", String(n)),
        track: o.track,
        min: o.price_min * n,
        max: o.price_max * n,
        monthly: o.price_mode === "monthly",
      });
      continue;
    }
    if (o.price_min === 0 && o.price_max === 0) continue; // «Incluido», «No»
    items.push({
      key: o.key,
      label: o.line_label || o.label,
      track: o.track,
      min: o.price_min,
      max: o.price_max,
      monthly: o.price_mode === "monthly",
    });
  }

  let one: [number, number] = [0, 0];
  let monthly: [number, number] = [0, 0];
  for (const it of items) {
    const target = it.monthly ? monthly : one;
    target[0] += it.min;
    target[1] += it.max;
  }
  for (const o of percent) {
    const add: [number, number] = [(one[0] * o.price_min) / 100, (one[1] * o.price_max) / 100];
    items.push({ key: o.key, label: o.line_label || o.label, track: o.track, min: add[0], max: add[1], monthly: false });
    one = [one[0] + add[0], one[1] + add[1]];
  }
  one = [roundTo(one[0], settings.round_once), roundTo(one[1], settings.round_once)];
  monthly = [roundTo(monthly[0], settings.round_monthly), roundTo(monthly[1], settings.round_monthly)];

  // Plazo
  let weeks: [number, number] = [base.weeks_min, base.weeks_max];
  let factor = 1;
  for (const o of opts) {
    if (o.is_base || !available(o) || !isSelected(o, sel)) continue;
    weeks = [weeks[0] + o.weeks_min, weeks[1] + o.weeks_max];
    if (o.weeks_factor) factor *= Number(o.weeks_factor);
  }
  const minW = Math.max(1, settings.min_weeks);
  weeks = [Math.max(minW, weeks[0]), Math.max(minW, weeks[1])];
  if (factor !== 1) weeks = [Math.max(1, Math.ceil(weeks[0] * factor)), Math.max(1, Math.ceil(weeks[1] * factor))];

  return { items, one, monthly, weeks, level: levelFor(one[1], settings), lit: litBars(one[1], settings) };
}

export function levelFor(max: number, settings: EngineSettings = defaultEngineSettings): string {
  for (const l of settings.levels) if (l.below === null || max < l.below) return l.label;
  return settings.levels[settings.levels.length - 1]?.label ?? "";
}

export function litBars(max: number, settings: EngineSettings = defaultEngineSettings): number {
  return Math.max(1, Math.round(Math.min(1, max / settings.vu_max) * settings.vu_bars));
}

/** Texto del presupuesto para el lead y el email: «1.800 – 2.400 € + 480 – 640 €/mes». */
export function quoteLabel(q: Quote): string {
  return range(q.one[0], q.one[1]) + (q.monthly[1] > 0 ? ` + ${range(q.monthly[0], q.monthly[1])}/mes` : "");
}

/** Lo que el cliente necesita según el tipo elegido (para precargar «Hablemos»). */
export function needFromSelection(config: Config, sel: Selection): string {
  const base = config.options.find((o) => o.is_base && o.set_key && sel[o.set_key] === o.key);
  return base?.components?.some((c) => c.track === "RO") ? "Las dos cosas" : "Web";
}
