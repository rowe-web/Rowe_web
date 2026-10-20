import type { ConfigOption, ConfigSection, Page, Project, Scene, Service, SiteSnapshot } from "@/lib/content/types";
import * as data from "./seed-data";

/**
 * Versión «publicada» construida en memoria a partir del contenido inicial del diseño.
 * Se usa en la guía de estilo (/sistema/escenas) y como contenido de reserva en local
 * cuando la base de datos todavía no tiene ninguna versión publicada.
 */
export function buildFallbackSnapshot(): SiteSnapshot {
  const id = (prefix: string, key: string) => `${prefix}-${key}`;

  const settings = Object.fromEntries(data.settings.filter((s) => s.isPublic).map((s) => [s.key, s.value])) as SiteSnapshot["settings"];

  const scenes: Scene[] = data.scenes
    .filter((s) => s.visible ?? true)
    .map((s, i) => ({
      id: id("scene", s.key),
      key: s.key,
      position: i * 10,
      visible: true,
      name: s.name,
      kicker: s.kicker,
      title: s.title,
      body: s.body,
      cta_label: s.ctaLabel,
      cta_href: s.ctaHref,
      media_id: null,
      poster_id: null,
      data: s.data as Record<string, unknown>,
    }));

  const services: Service[] = data.services.map((s, i) => ({
    id: id("service", s.slug),
    discipline: s.discipline,
    slug: s.slug,
    position: i * 10,
    title: s.title,
    description: s.description,
    media_id: null,
  }));

  const pages = Object.fromEntries(
    data.pages.map((p): [string, Page] => [
      p.slug,
      {
        id: id("page", p.slug),
        slug: p.slug,
        kind: p.kind,
        title: p.title,
        intro: p.intro,
        blocks: p.blocks as unknown[],
        seo_title: p.seoTitle,
        seo_description: p.seoDescription,
        og_media_id: null,
      },
    ]),
  );

  const projects: Project[] = data.projects
    .filter((p) => p.status === "publicado")
    .map((p, i) => ({
      id: id("project", p.slug),
      slug: p.slug,
      title: p.title,
      client: p.client,
      sector: p.sector,
      year: p.year,
      category: p.category,
      summary: p.summary,
      challenge: p.challenge,
      solution: p.solution,
      result: p.result,
      metrics: p.metrics,
      cover_id: null,
      video_id: null,
      client_url: "",
      seo_title: `${p.title} — Caso de estudio · ROWE`,
      seo_description: p.summary,
      featured: p.featured,
      position: i * 10,
      gallery: [],
    }));

  const sections: ConfigSection[] = data.configSections.map((s, i) => ({
    key: s.key,
    position: i * 10,
    take_label: s.takeLabel,
    title: s.title,
    description: s.description ?? "",
    requires: (s.requires as ConfigSection["requires"]) ?? null,
    locked_title: s.lockedTitle ?? "",
    locked_body: s.lockedBody ?? "",
    locked_cta: s.lockedCta ?? "",
    locked_select: s.lockedSelect ?? "",
  }));

  const options: ConfigOption[] = data.configOptions.map((o, i) => ({
    section_key: o.section,
    key: o.key,
    position: i * 10,
    control: o.control,
    set_key: o.setKey ?? null,
    set_label: o.setLabel ?? "",
    set_description: o.setDescription ?? "",
    badge: o.badge ?? "",
    label: o.label,
    description: o.description ?? "",
    line_label: o.lineLabel ?? "",
    price_min: o.priceMin,
    price_max: o.priceMax,
    price_mode: o.priceMode ?? "once",
    unit_label: o.unitLabel ?? "",
    track: o.track ?? "WE",
    is_base: o.isBase ?? false,
    components: o.components ?? null,
    modifies_base: o.modifiesBase ?? false,
    base_suffix: o.baseSuffix ?? "",
    weeks_min: o.weeksMin ?? 0,
    weeks_max: o.weeksMax ?? 0,
    weeks_factor: o.weeksFactor ?? null,
    stepper_min: o.stepper?.min ?? null,
    stepper_max: o.stepper?.max ?? null,
    stepper_included: o.stepper?.included ?? null,
    is_default: o.isDefault ?? false,
    requires: (o.requires as ConfigOption["requires"]) ?? null,
  }));

  return {
    version: 0,
    published_at: "",
    settings,
    scenes,
    services,
    pages,
    projects,
    configurator: { sections, options },
    media: {},
  };
}
