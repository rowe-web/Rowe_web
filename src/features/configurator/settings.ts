import type { SiteSnapshot } from "@/lib/content/types";
import { defaultEngineSettings, type EngineSettings } from "./engine";

/** Textos y reglas del configurador (ajuste «configurator», editable desde el panel). */
export interface ConfiguratorSettings extends EngineSettings {
  kicker: string;
  meta: string;
  title: string;
  lead: string;
  promise: string;
  monitor_label: string;
  rec_label: string;
  standby_label: string;
  empty_text: string;
  once_text: string;
  level_label: string;
  weeks_label: string;
  includes_label: string;
  includes: string;
  /** «Incluye siempre» cuando el presupuesto no lleva web (Solo contenido). */
  includes_content: string;
  cta_send: string;
  cta_pdf: string;
  need_first: string;
  disclaimer: string;
  empty_track: string;
  add_content_hint: string;
  add_web_hint: string;
  mobile_label: string;
  mobile_cta: string;
  pdf: { title: string; label: string; note: string; validity_days: number; file_name: string };
}

const fallback: ConfiguratorSettings = {
  ...defaultEngineSettings,
  kicker: "",
  meta: "",
  title: "",
  lead: "",
  promise: "",
  monitor_label: "Presupuesto orientativo",
  rec_label: "Rec",
  standby_label: "Standby",
  empty_text: "",
  once_text: "Pago único",
  level_label: "Nivel de proyecto",
  weeks_label: "Plazo estimado",
  includes_label: "Incluye siempre",
  includes: "",
  includes_content: "",
  cta_send: "Enviar y hablemos",
  cta_pdf: "Descargar PDF",
  need_first: "Elige primero qué necesitas",
  disclaimer: "",
  empty_track: "Sin clips",
  add_content_hint: "Añade contenido",
  add_web_hint: "Añade web",
  mobile_label: "Orientativo",
  mobile_cta: "Resumen ↓",
  pdf: { title: "", label: "Presupuesto orientativo", note: "", validity_days: 30, file_name: "Presupuesto_ROWE.pdf" },
};

export function getConfiguratorSettings(site: SiteSnapshot): ConfiguratorSettings {
  const v = (site.settings.configurator ?? {}) as Partial<ConfiguratorSettings>;
  return { ...fallback, ...v, pdf: { ...fallback.pdf, ...(v.pdf ?? {}) } };
}
