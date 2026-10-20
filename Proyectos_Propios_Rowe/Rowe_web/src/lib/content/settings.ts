import type { SiteSnapshot } from "./types";

export interface ContactSettings {
  email_contact: string;
  email_admin: string;
  email_social: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
  youtube: string;
  /** Dónde trabajamos: las webs (online) y los rodajes (presenciales, en una zona). */
  service_area_web: string;
  service_area_video: string;
  service_area_cities: string[];
  service_area_note: string;
}

export interface BrandSettings {
  tagline: string;
  year: string;
  city: string;
  legend: string[];
  credits: string;
  tab_away_title: string;
  ambient_on: string;
  ambient_off: string;
  ambient_audio_media_id: string | null;
  not_found_title: string;
  not_found_body: string;
}

export interface CookieSettings {
  enabled: boolean;
  text: string;
  accept: string;
  reject: string;
  configure: string;
}

export interface NavigationSettings {
  menu_label: string;
  close_label: string;
  cta_label: string;
  cta_href: string;
  menu_kicker: string;
  /** Elementos del menú. `summary`: resumen al pasar por encima (la animación depende del enlace). */
  items: { label: string; href: string; caption: string; summary?: string }[];
  footer_title: string;
  footer_end: string;
  legal: { label: string; href: string }[];
  preloader_label: string;
  preloader_meta: string;
  /** Líneas de «build» del preloader (la parte web): avanzan con la carga. */
  preloader_steps: string[];
}

export const emptyNavigation: NavigationSettings = {
  menu_label: "Menú",
  close_label: "Cerrar",
  cta_label: "Hablemos",
  cta_href: "/#hablemos",
  menu_kicker: "",
  items: [],
  footer_title: "",
  footer_end: "Fin",
  legal: [],
  preloader_label: "",
  preloader_meta: "",
  preloader_steps: [],
};

export function getSetting<T>(site: SiteSnapshot, key: string, fallback: T): T {
  const value = site.settings[key] as unknown;
  if (value && typeof value === "object") return { ...fallback, ...(value as object) } as T;
  return fallback;
}

export const emptyContact: ContactSettings = {
  email_contact: "",
  email_admin: "",
  email_social: "",
  phone: "",
  whatsapp: "",
  address: "",
  hours: "",
  instagram: "",
  tiktok: "",
  linkedin: "",
  youtube: "",
  service_area_web: "",
  service_area_video: "",
  service_area_cities: [],
  service_area_note: "",
};

export const emptyBrand: BrandSettings = {
  tagline: "Web & Audiovisual",
  year: "",
  city: "",
  legend: [],
  credits: "",
  tab_away_title: "",
  ambient_on: "",
  ambient_off: "",
  ambient_audio_media_id: null,
  not_found_title: "",
  not_found_body: "",
};

/** Un dato entre corchetes es provisional y hay que sustituirlo antes del lanzamiento («[+34 600 000 000]»). */
export function isPlaceholderValue(value: unknown): value is string {
  return typeof value === "string" && /\[.*\]/.test(value);
}

/** Un dato que se puede enseñar: no está vacío ni es provisional. Lo que no lo es, ni se ve ni genera enlaces. */
export function hasRealValue(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !isPlaceholderValue(value);
}

/** Enlace de WhatsApp a partir del número escrito en el panel (ignora espacios). */
export function whatsappHref(phone: string): string {
  const digits = hasRealValue(phone) ? phone.replace(/\D/g, "") : "";
  return digits ? `https://wa.me/${digits}` : "";
}

/** Enlace tel: a partir del número escrito en el panel. */
export function telHref(phone: string): string {
  const tel = hasRealValue(phone) ? phone.replace(/[^\d+]/g, "") : "";
  return tel ? `tel:${tel}` : "";
}

/** Enlace mailto: a partir del email escrito en el panel. */
export function mailtoHref(email: string): string {
  return hasRealValue(email) ? `mailto:${email.trim()}` : "";
}

/** Enlace de Instagram a partir de «@usuario». */
export function instagramHref(handle: string): string {
  const user = hasRealValue(handle) ? handle.replace(/^@/, "").trim() : "";
  return user ? `https://instagram.com/${user}` : "";
}

/** Ciudades de la zona de rodaje que se pueden enseñar. */
export function serviceCities(contact: ContactSettings): string[] {
  return (Array.isArray(contact.service_area_cities) ? contact.service_area_cities : []).filter(hasRealValue).map((c) => c.trim());
}

/** «Rodajes en el Camp de Tarragona: Tarragona · Reus · Salou…» (vacío si no hay nada real). */
export function videoAreaText(contact: ContactSettings): string {
  const video = hasRealValue(contact.service_area_video) ? contact.service_area_video.trim() : "";
  const cities = serviceCities(contact).join(" · ");
  return video && cities ? `${video}: ${cities}` : video || cities;
}

/** URL pública de un fichero del bucket de medios. */
export function mediaUrl(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export interface LegalSettings {
  owner: string;
  nif: string;
  address: string;
  email: string;
  hosting: string;
  updated: string;
}

export const emptyLegal: LegalSettings = { owner: "", nif: "", address: "", email: "", hosting: "", updated: "" };

/**
 * Rellena las marcas de los textos legales: {titular}, {nif}, {domicilio}, {email},
 * {alojamiento}, {actualizado} (Ajustes → Datos legales) y {web}, {dominio} (la dirección
 * real de la web). Una marca desconocida se deja tal cual para que se vea y se corrija.
 */
export function fillLegal(text: string, legal: LegalSettings, site: { url: string; host: string }): string {
  const values: Record<string, string> = {
    titular: legal.owner,
    nif: legal.nif,
    domicilio: legal.address,
    email: legal.email,
    alojamiento: legal.hosting,
    actualizado: legal.updated,
    web: site.url,
    dominio: site.host,
  };
  return text.replace(/\{([a-z]+)\}/g, (m, k: string) => (k in values && values[k] ? values[k] : m));
}
