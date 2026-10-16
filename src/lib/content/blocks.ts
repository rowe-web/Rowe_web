/**
 * Secciones de las páginas internas (columna pages.blocks).
 * Cada página es una lista ordenada de secciones con un `type`; se añaden, quitan,
 * reordenan y editan desde Ajustes → Páginas y legal. Un tipo desconocido no se muestra.
 * Las páginas legales usan apartados { title, body } sin `type`.
 */

export interface LinkValue {
  label: string;
  href: string;
}

export interface CabeceraBlock {
  type: "cabecera";
  kicker: string;
  meta: string[];
  /** Plano 2.39:1 bajo el titular (opcional): imagen, o vídeo con la imagen como póster. */
  image_media_id: string | null;
  video_media_id: string | null;
  caption: string;
  cta: LinkValue;
  secondary: LinkValue;
}

export interface ServiciosBlock {
  type: "servicios";
  kicker: string;
  title: string;
  discipline: "web" | "audiovisual";
}

export interface EscenaBlock {
  type: "escena";
  /** Clave de una escena de la home (web, audiovisual, proceso, ecosistema, filosofia…). */
  key: string;
  /** Antetítulo propio en esta página (vacío = el de la escena). */
  kicker: string;
}

export interface IncluyeBlock {
  type: "incluye";
  kicker: string;
  title: string;
  items: { title: string; body: string }[];
}

export interface ProyectosBlock {
  type: "proyectos";
  kicker: string;
  title: string;
  /** "Web" o "Audiovisual" (incluye los «Web + Audiovisual»); vacío = todos. */
  category: string;
  limit: number;
  all_label: string;
}

export interface ListadoBlock {
  type: "listado";
  all_label: string;
  empty_text: string;
  cta_label: string;
}

export interface PreguntasBlock {
  type: "preguntas";
  kicker: string;
  title: string;
  items: { q: string; a: string }[];
}

export interface CierreBlock {
  type: "cierre";
  kicker: string;
  title: string;
  body: string;
  cta: LinkValue;
  secondary: LinkValue;
}

export interface ContactoBlock {
  type: "contacto";
  kicker: string;
  title: string;
  channels_label: string;
  form_label: string;
}

export type PageBlock =
  | CabeceraBlock
  | ServiciosBlock
  | EscenaBlock
  | IncluyeBlock
  | ProyectosBlock
  | ListadoBlock
  | PreguntasBlock
  | CierreBlock
  | ContactoBlock;

export type BlockType = PageBlock["type"];

/** Plantillas para «Añadir sección» en el panel (también documentan los campos). */
export const BLOCK_TEMPLATES: Record<BlockType, { label: string; hint: string; value: PageBlock }> = {
  cabecera: {
    label: "Cabecera",
    hint: "Antetítulo, titular y entradilla de la página, botones e imagen o vídeo 2.39:1.",
    value: { type: "cabecera", kicker: "", meta: [], image_media_id: null, video_media_id: null, caption: "", cta: { label: "", href: "" }, secondary: { label: "", href: "" } },
  },
  servicios: {
    label: "Lista de servicios",
    hint: "Los servicios de una disciplina (se editan en Textos y escenas → Servicios).",
    value: { type: "servicios", kicker: "", title: "", discipline: "web" },
  },
  escena: {
    label: "Escena de la home",
    hint: "Reutiliza una escena tal cual: web, audiovisual, ecosistema, proceso, proyectos, filosofia.",
    value: { type: "escena", key: "proceso", kicker: "" },
  },
  incluye: {
    label: "Qué incluye",
    hint: "Rejilla numerada de puntos con título y texto.",
    value: { type: "incluye", kicker: "", title: "", items: [{ title: "", body: "" }] },
  },
  proyectos: {
    label: "Proyectos relacionados",
    hint: "Proyectos publicados de una categoría (Web o Audiovisual; vacío = todos).",
    value: { type: "proyectos", kicker: "", title: "", category: "", limit: 4, all_label: "Ver todos los proyectos" },
  },
  listado: {
    label: "Listado de proyectos con filtros",
    hint: "Todos los proyectos publicados, filtrables por categoría.",
    value: { type: "listado", all_label: "Todos", empty_text: "", cta_label: "Ver proyecto" },
  },
  preguntas: {
    label: "Preguntas frecuentes",
    hint: "Preguntas y respuestas desplegables.",
    value: { type: "preguntas", kicker: "", title: "", items: [{ q: "", a: "" }] },
  },
  cierre: {
    label: "Cierre con botón",
    hint: "Banda final a pantalla completa con titular y botones.",
    value: { type: "cierre", kicker: "", title: "", body: "", cta: { label: "", href: "" }, secondary: { label: "", href: "" } },
  },
  contacto: {
    label: "Contacto y formulario",
    hint: "Canales de contacto (de Ajustes → Contacto) y el formulario «Hablemos».",
    value: { type: "contacto", kicker: "", title: "", channels_label: "", form_label: "" },
  },
};

const TYPES = new Set(Object.keys(BLOCK_TEMPLATES));

/**
 * Secciones válidas de una página, completando los campos que falten con la plantilla
 * (así una sección antigua o incompleta nunca rompe la página).
 */
export function pageBlocks(blocks: unknown): PageBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((b) => {
    if (!b || typeof b !== "object") return [];
    const type = (b as { type?: unknown }).type;
    if (typeof type !== "string" || !TYPES.has(type)) return [];
    return [{ ...BLOCK_TEMPLATES[type as BlockType].value, ...(b as object) } as PageBlock];
  });
}

/** Apartados de una página legal. */
export function legalBlocks(blocks: unknown): { title: string; body: string }[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (b): b is { title: string; body: string } =>
      !!b && typeof b === "object" && !("type" in b) && typeof (b as { body?: unknown }).body === "string",
  ).map((b) => ({ title: typeof b.title === "string" ? b.title : "", body: b.body }));
}

/** ¿Un proyecto entra en el filtro «Web» / «Audiovisual»? «Web + Audiovisual» entra en los dos. */
export function inCategory(category: string, filter: string): boolean {
  if (!filter) return true;
  return category === filter || category === "Web + Audiovisual";
}
