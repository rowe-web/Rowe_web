import { z } from "zod";

/**
 * Validación de una solicitud «Hablemos» — la MISMA en el navegador y en el servidor.
 * Los límites coinciden con las restricciones de la tabla `leads`.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const leadSchema = z.object({
  need: z.string().trim().min(1).max(80),
  sector: z.string().trim().max(80).default(""),
  /** Rango elegido, o "cfg" si viene del configurador (el servidor lo recalcula). */
  budget: z.string().trim().max(160).default(""),
  message: z.string().trim().max(600).default(""),
  name: z.string().trim().min(1, "name").max(120),
  company: z.string().trim().max(160).default(""),
  email: z.string().trim().toLowerCase().max(254).regex(EMAIL_RE, "email"),
  phone: z.string().trim().max(40).default(""),
  /** Ubicación / ciudad: para valorar la logística de los rodajes. */
  city: z.string().trim().max(120).default(""),
  privacy: z.literal(true, { error: "privacy" }),
  /** Selección del configurador (solo si budget === "cfg"). */
  selection: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
  /** Anti-spam: campo trampa (debe llegar vacío) y tiempo desde que se empezó a rellenar. */
  website: z.string().max(200).default(""),
  elapsed: z.number().int().nonnegative().default(0),
  source: z
    .object({
      path: z.string().max(300).default("/"),
      referrer: z.string().max(500).default(""),
      utm: z.record(z.string(), z.string().max(120)).default({}),
      variant: z.enum(["section", "overlay"]).default("section"),
    })
    .default({ path: "/", referrer: "", utm: {}, variant: "section" }),
});

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;

/** Errores de campo para la interfaz: { name: true, email: true, privacy: true } */
export function fieldErrors(input: { name?: string; email?: string; privacy?: boolean }): Partial<Record<"name" | "email" | "privacy", true>> {
  const e: Partial<Record<"name" | "email" | "privacy", true>> = {};
  if (!input.name?.trim()) e.name = true;
  if (!EMAIL_RE.test((input.email ?? "").trim())) e.email = true;
  if (input.privacy !== true) e.privacy = true;
  return e;
}

/** Tiempo mínimo humano para rellenar el formulario (ms). Más rápido = bot. */
export const MIN_ELAPSED_MS = 2500;
