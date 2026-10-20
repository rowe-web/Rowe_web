"use client";

import { MediaPicker } from "@/admin/media/library";
import { AButton, Field, Switch, TextArea, TextInput } from "./kit";
import { mono } from "./styles";

/**
 * Editor genérico de datos (escenas, ajustes, páginas): convierte cualquier objeto
 * JSON en un formulario. Así ningún texto queda «a fuego» y un campo nuevo en una
 * escena se puede editar sin tocar el panel.
 */
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const LABELS: Record<string, string> = {
  title: "Titular", body: "Texto", text: "Texto", lead: "Entradilla", label: "Etiqueta", href: "Enlace", caption: "Pie de foto",
  description: "Descripción", key: "Clave / número", value: "Valor", items: "Elementos", steps: "Pasos", points: "Puntos",
  stats: "Cifras", tracks: "Pistas", clips: "Clips", size: "Tamaño relativo", duration: "Duración", sector: "Sector", track: "Pista",
  word: "Palabra", hover: "Al pasar el ratón", master: "Máster", reels: "Reels", formats: "Formatos", specs: "Ficha técnica",
  claim: "Frase de posicionamiento (*texto* = cursiva)", secondary_cta: "Botón secundario", reel_label: "Texto del showreel", sound_label: "Texto de sonido", scroll_hint: "Texto «Desliza»",
  photo_caption: "Pie de la Fig. 01 (proceso)", video_caption: "Pie del vídeo", process_video_media_id: "Vídeo del proceso 4:5 (la foto hace de póster)",
  process_steps: "Fases de la animación del proceso", view_desktop: "Botón vista escritorio", view_mobile: "Botón vista móvil",
  mobile_media_id: "Grabación de la web en móvil (vertical)", photo_media_id: "Póster del vídeo del proceso (4:5)", program_label: "Rótulo del programa", format_label: "Formato",
  sequence_label: "Rótulo de la secuencia", url_label: "Dirección de ejemplo", screen_caption: "Pie del visor", all_label: "Texto «ver todos»",
  all_href: "Enlace «ver todos»", drag_label: "Texto del cursor de arrastre", kicker: "Antetítulo", meta: "Metadatos", promise: "Promesa",
  email_contact: "Email de contacto", email_admin: "Email de administración", email_social: "Email de redes", phone: "Teléfono",
  whatsapp: "WhatsApp", address: "Dirección", hours: "Horario", instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn",
  youtube: "YouTube", tagline: "Lema", year: "Año", city: "Ciudad", legend: "Leyenda", credits: "Créditos del pie",
  tab_away_title: "Título de la pestaña al salir", ambient_on: "Aviso sonido activado", ambient_off: "Aviso sonido desactivado",
  not_found_title: "Titular de la página 404", not_found_body: "Texto de la página 404", enabled: "Activado", accept: "Botón aceptar",
  reject: "Botón rechazar", configure: "Botón configurar", menu_label: "Texto «Menú»", close_label: "Texto «Cerrar»", cta_label: "Texto del botón",
  cta_href: "Enlace del botón", menu_kicker: "Antetítulo del menú", footer_title: "Titular del pie", footer_end: "Texto final del pie",
  legal: "Enlaces legales", preloader_label: "Rótulo del preloader", preloader_meta: "Metadatos del preloader", preloader_steps: "Líneas de código del preloader", summary: "Resumen al pasar por encima", lead_recipients: "Destinatarios de los avisos",
  steps_: "Pasos", needs: "Opciones «¿Qué necesitas?»", sectors: "Sectores", budgets: "Rangos de presupuesto", fields: "Campos",
  errors: "Mensajes de error", next: "Botón siguiente", back: "Botón atrás", submit: "Botón enviar", loading: "Texto enviando", retry: "Botón reintentar",
  success_meta: "Rótulo de éxito", success_title: "Titular de éxito", success_body: "Texto de éxito", success_reset: "Botón «enviar otra»",
  copy: "Texto «Copiar»", copied: "Texto «Copiado»", overlay_title: "Titular del overlay", overlay_lead: "Texto del overlay",
  prefill_label: "Rótulo «viene del configurador»", prefill_overlay_label: "Rótulo «tu configuración»", prefill_edit: "Texto «editar»",
  budget_from_configurator: "Etiqueta del rango del configurador", message_placeholder: "Ejemplo del mensaje", message_max: "Máximo de caracteres",
  optional: "Texto «opcional»", hint: "Pista", name: "Nombre", name_placeholder: "Ejemplo del nombre", company: "Empresa",
  company_placeholder: "Ejemplo de empresa", email: "Email", email_placeholder: "Ejemplo de email", phone_placeholder: "Ejemplo de teléfono", city_placeholder: "Ejemplo de ciudad",
  privacy: "Texto de privacidad", privacy_link: "Enlace a la privacidad", send_title: "Titular de error de envío", send_body: "Texto de error de envío",
  monitor_label: "Rótulo del monitor", rec_label: "Texto «Rec»", standby_label: "Texto «Standby»", empty_text: "Texto sin selección",
  once_text: "Texto «pago único»", level_label: "Rótulo del nivel", levels: "Niveles", below: "Hasta (€, vacío = resto)", vu_bars: "Barras del medidor",
  vu_max: "Importe del medidor lleno (€)", round_once: "Redondeo del pago único (€)", round_monthly: "Redondeo mensual (€)", min_weeks: "Plazo mínimo (semanas)",
  weeks_label: "Rótulo del plazo", includes_label: "Rótulo «incluye»", includes: "Incluye siempre", includes_content: "Incluye siempre (solo contenido)", cta_send: "Botón enviar", cta_pdf: "Botón PDF",
  need_first: "Aviso «elige primero»", disclaimer: "Nota legal de precios", empty_track: "Texto pista vacía", add_content_hint: "Texto «añade contenido»", add_web_hint: "Texto «añade web»",
  mobile_label: "Rótulo barra móvil", mobile_cta: "Botón barra móvil", pdf: "PDF", note: "Nota", validity_days: "Validez (días)", file_name: "Nombre del archivo",
  seo_title: "Título en Google", seo_description: "Descripción en Google",
  discipline: "Disciplina (web o audiovisual)", category: "Categoría (Web, Audiovisual o vacío = todas)", limit: "Máximo de proyectos",
  q: "Pregunta", a: "Respuesta", cta: "Botón principal", secondary: "Botón secundario", image_media_id: "Imagen 2.39:1",
  video_media_id: "Vídeo 2.39:1 (opcional, usa la imagen como póster)", channels_label: "Rótulo de los canales", form_label: "Rótulo del formulario",
  service_area_web: "Webs (dónde)", service_area_video: "Rodajes (dónde)", service_area_cities: "Ciudades de rodaje", service_area_note: "Nota sobre el desplazamiento",
  owner: "Titular (nombre y apellidos o razón social)", nif: "NIF / CIF", hosting: "Proveedor de alojamiento web", updated: "Última actualización",
};

const LONG = new Set(["a", "body", "claim", "text", "lead", "description", "note", "message_placeholder", "success_body", "send_body", "not_found_body", "overlay_lead", "disclaimer", "includes", "includes_content", "summary"]);

export function humanize(key: string) {
  return LABELS[key] ?? key.replace(/_media_id$/, "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function blankLike(v: Json): Json {
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)]));
  return null;
}

function mediaKind(key: string) {
  return /video|reel/.test(key) ? "video" : /audio/.test(key) ? "audio" : "image";
}

interface Props {
  value: Json;
  onChange: (v: Json) => void;
  /** Clave del campo (para la etiqueta y el tipo). */
  name?: string;
  depth?: number;
  /** En el primer nivel, campos en rejilla (p. ej. Contacto). */
  grid?: boolean;
  /** Claves que no se muestran (las edita otra parte de la pantalla). */
  hide?: string[];
}

export function JsonFields({ value, onChange, name = "", depth = 0, grid = false, hide = [] }: Props) {
  const label = humanize(name);

  if (name.endsWith("_media_id") && (typeof value === "string" || value === null)) {
    return <MediaPicker label={label} value={value} onChange={onChange} kind={mediaKind(name)} />;
  }

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <span className="text-[14px]">{label}</span>
        <Switch checked={value} onChange={onChange} label={label} />
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <Field label={label}>
        <TextInput type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      </Field>
    );
  }

  if (typeof value === "string" || value === null) {
    const v = value ?? "";
    const long = LONG.has(name) || v.length > 70 || v.includes("\n");
    return (
      <Field label={label} count={long ? v.length : undefined} hint={/title|titular/.test(name) && depth === 0 ? "*texto* = cursiva serif · salto de línea = nueva línea" : undefined}>
        {long ? <TextArea rows={Math.min(8, Math.max(2, Math.ceil(v.length / 70)))} value={v} onChange={(e) => onChange(e.target.value)} /> : <TextInput value={v} onChange={(e) => onChange(e.target.value)} />}
      </Field>
    );
  }

  if (Array.isArray(value)) {
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= value.length) return;
      const next = value.slice();
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };
    const template: Json = value.length ? blankLike(value[0]) : "";
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className={`${mono} mb-1 text-muted`}>
          {label} · {value.length}
        </legend>
        {value.map((item, i) => (
          <div key={i} className={`flex gap-2 ${typeof item === "object" && item !== null ? "flex-col rounded-md border border-line-soft p-3.5" : "items-start"}`}>
            {typeof item === "object" && item !== null ? (
              <>
                <div className="flex items-center justify-between">
                  <span className={`${mono} text-muted`}>#{i + 1}</span>
                  <ItemTools onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => onChange(value.filter((_, k) => k !== i))} />
                </div>
                <JsonFields value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} depth={depth + 1} />
              </>
            ) : (
              <>
                <div className="flex-1">
                  <TextInput aria-label={`${label} ${i + 1}`} value={String(item ?? "")} onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))} />
                </div>
                <ItemTools onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => onChange(value.filter((_, k) => k !== i))} />
              </>
            )}
          </div>
        ))}
        <AButton size="sm" onClick={() => onChange([...value, template])} className="self-start">
          + Añadir
        </AButton>
      </fieldset>
    );
  }

  // Objeto
  const entries = Object.entries(value).filter(([k]) => !hide.includes(k));
  const body = (
    <div className={`grid gap-4 ${grid ? "grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-[18px]" : ""}`}>
      {entries.map(([k, v]) => (
        <JsonFields key={k} name={k} value={v} depth={depth + 1} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  );
  if (!name) return body;
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-line-soft p-3.5">
      <legend className={`${mono} px-1 text-muted`}>{label}</legend>
      {body}
    </fieldset>
  );
}

function ItemTools({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  const btn = "flex h-8 w-8 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone";
  return (
    <span className="flex flex-none">
      <button type="button" onClick={onUp} className={btn} aria-label="Subir">
        ↑
      </button>
      <button type="button" onClick={onDown} className={btn} aria-label="Bajar">
        ↓
      </button>
      <button type="button" onClick={onRemove} className={`${btn} hover:!text-rec`} aria-label="Quitar">
        ✕
      </button>
    </span>
  );
}
