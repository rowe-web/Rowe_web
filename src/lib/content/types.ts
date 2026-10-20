/**
 * Forma de la versión publicada (tabla releases.snapshot), generada por
 * public.build_snapshot() en supabase/migrations/0002_functions.sql.
 */

export type Track = "WE" | "RO";

export interface MediaItem {
  id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime: string;
  kind: "image" | "video" | "audio" | "other";
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  alt: string;
  blur_data_url: string | null;
  poster_id: string | null;
}

export interface Scene<TData = Record<string, unknown>> {
  id: string;
  key: string;
  position: number;
  visible: boolean;
  name: string;
  kicker: string;
  title: string;
  body: string;
  cta_label: string;
  cta_href: string;
  media_id: string | null;
  poster_id: string | null;
  data: TData;
}

export interface Service {
  id: string;
  discipline: "web" | "audiovisual";
  slug: string;
  position: number;
  title: string;
  description: string;
  media_id: string | null;
}

export interface Page {
  id: string;
  slug: string;
  kind: "service" | "projects" | "contact" | "legal" | "system";
  title: string;
  intro: string;
  blocks: unknown[];
  seo_title: string;
  seo_description: string;
  og_media_id: string | null;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  client: string;
  sector: string;
  year: number | null;
  category: "Web" | "Audiovisual" | "Web + Audiovisual";
  summary: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: { value: string; label: string }[];
  cover_id: string | null;
  video_id: string | null;
  client_url: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  position: number;
  gallery: string[];
  /** Proyecto de ejemplo del diseño. Solo en el borrador del panel: la versión publicada no lo lleva. */
  is_placeholder?: boolean;
}

export interface ConfigSection {
  key: string;
  position: number;
  take_label: string;
  title: string;
  description: string;
  requires: Requirement | null;
  locked_title: string;
  locked_body: string;
  locked_cta: string;
  locked_select: string;
}

export interface Requirement {
  set: string;
  in: string[];
}

export interface ConfigOption {
  section_key: string;
  key: string;
  position: number;
  control: "card" | "segment" | "toggle" | "stepper";
  set_key: string | null;
  set_label: string;
  set_description: string;
  badge: string;
  label: string;
  description: string;
  line_label: string;
  price_min: number;
  price_max: number;
  price_mode: "once" | "monthly" | "percent_once";
  unit_label: string;
  track: Track;
  is_base: boolean;
  components: { label: string; track: Track; min: number; max: number; base?: boolean }[] | null;
  modifies_base: boolean;
  base_suffix: string;
  weeks_min: number;
  weeks_max: number;
  weeks_factor: number | null;
  stepper_min: number | null;
  stepper_max: number | null;
  stepper_included: number | null;
  is_default: boolean;
  requires: Requirement | null;
}

/** Ajustes públicos. Los valores concretos se tipan en cada feature que los usa. */
export type Settings = Record<string, Record<string, unknown>>;

export interface SiteSnapshot {
  version: number;
  published_at: string;
  settings: Settings;
  scenes: Scene[];
  services: Service[];
  pages: Record<string, Page>;
  projects: Project[];
  configurator: { sections: ConfigSection[]; options: ConfigOption[] };
  media: Record<string, MediaItem>;
}
