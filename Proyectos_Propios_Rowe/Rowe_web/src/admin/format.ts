/** Formatos del panel (es-ES, zona horaria de Madrid). */

const TZ = "Europe/Madrid";

function dayKey(d: Date) {
  return d.toLocaleDateString("es-ES", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
}

/** «Hoy · 10:42», «Ayer · 18:30», «13 oct · 12:04», «13 oct 2025». */
export function when(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(now)) return `Hoy · ${time}`;
  if (dayKey(d) === dayKey(yesterday)) return `Ayer · ${time}`;
  const sameYear = d.toLocaleDateString("es-ES", { timeZone: TZ, year: "numeric" }) === now.toLocaleDateString("es-ES", { timeZone: TZ, year: "numeric" });
  const date = d.toLocaleDateString("es-ES", { timeZone: TZ, day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).replace(".", "");
  return sameYear ? `${date} · ${time}` : date;
}

/** Agrupación por día para el historial: «Hoy», «Ayer», «13 oct». */
export function dayLabel(iso: string, now = new Date()): string {
  const w = when(iso, now);
  return w.split(" · ")[0];
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

export function longToday(now = new Date()) {
  const s = now.toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const num = (n: number) => new Intl.NumberFormat("es-ES").format(Math.round(n));

export function percent(n: number, digits = 1) {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

/** «+12 % vs. semana anterior», «Sin datos previos». */
export function delta(cur: number, prev: number, period: string): string {
  if (!prev) return cur ? `Nuevo · sin datos del ${period} anterior` : `Sin datos aún`;
  const d = ((cur - prev) / prev) * 100;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(d))} % vs. ${period} anterior`;
}

/** 108 → «1:48» */
export function duration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB`;
}

export const LEAD_STATUS = {
  nuevo: { label: "Nuevo", tone: "on" },
  contactado: { label: "Contactado", tone: "half" },
  cerrado: { label: "Cerrado", tone: "off" },
} as const;

/** «Clínica Dental Mar» → «clinica-dental-mar» (direcciones de proyectos). */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
