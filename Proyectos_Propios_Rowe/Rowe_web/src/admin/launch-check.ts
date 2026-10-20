import { isPlaceholderValue } from "@/lib/content/settings";
import type { SiteSnapshot } from "@/lib/content/types";

/**
 * Lista de lanzamiento: contenido provisional que no debería llegar a la web pública.
 * Función pura sobre el borrador (public.build_snapshot() + is_placeholder de los proyectos);
 * la usan el inicio del panel y el aviso antes de publicar.
 */

export interface LaunchIssue {
  id: string;
  severity: "bloqueante" | "aviso";
  title: string;
  detail: string;
  /** Pantalla del panel donde se arregla. */
  href: string;
}

/** Ajuste → pestaña de Ajustes que lo edita. */
const SETTING_TABS: Record<string, { tab: string; label: string }> = {
  contact: { tab: "contacto", label: "Contacto" },
  seo: { tab: "seo", label: "SEO" },
  legal: { tab: "legal", label: "Datos legales" },
  cookies: { tab: "cookies", label: "Cookies" },
  brand: { tab: "marca", label: "Marca" },
  navigation: { tab: "navegacion", label: "Menú y pie" },
  configurator: { tab: "configurador", label: "Configurador" },
  hablemos: { tab: "formulario", label: "Formulario «Hablemos»" },
};

const FIELD_LABELS: Record<string, string> = {
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  address: "Dirección",
  city: "Ciudad",
  owner: "Titular",
  nif: "NIF / CIF",
  email: "Email",
  hosting: "Alojamiento",
  phone_placeholder: "Ejemplo de teléfono",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

const LEGAL_REQUIRED = ["owner", "nif", "address", "email", "hosting"] as const;
const SOCIAL = ["instagram", "tiktok", "linkedin", "youtube"] as const;

const settingHref = (key: string) => `/admin/ajustes?tab=${SETTING_TABS[key]?.tab ?? key}`;
const settingLabel = (key: string) => SETTING_TABS[key]?.label ?? key;

/** Recorre un valor y devuelve cada texto entre corchetes con su ruta. */
function placeholders(value: unknown, path: (string | number)[] = []): { path: (string | number)[]; value: string }[] {
  if (isPlaceholderValue(value)) return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => placeholders(v, [...path, i]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => placeholders(v, [...path, k]));
  return [];
}

/** «phone» → «Teléfono»; «items › 2 › label» para lo anidado. */
function fieldName(path: (string | number)[]): string {
  return path.map((p) => (typeof p === "number" ? String(p + 1) : (FIELD_LABELS[p] ?? p))).join(" › ");
}

/** «@usuario», «usuario» o una URL («linkedin.com/company/rowe», «https://…»). */
export function isValidSocial(value: string): boolean {
  const v = value.trim();
  return /^@?[\w.-]{1,60}$/.test(v) || /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i.test(v);
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function launchIssues(site: SiteSnapshot): LaunchIssue[] {
  const issues: LaunchIssue[] = [];
  const add = (issue: LaunchIssue) => {
    if (!issues.some((i) => i.id === issue.id)) issues.push(issue);
  };
  const provisional = (id: string, where: string, found: { path: (string | number)[]; value: string }, href: string) =>
    add({ id: `provisional:${id}:${found.path.join(".")}`, severity: "bloqueante", title: `Dato provisional en ${where}`, detail: `${fieldName(found.path)}: «${found.value}»`, href });

  // Datos entre corchetes
  for (const [key, value] of Object.entries(site.settings)) {
    for (const found of placeholders(value)) provisional(`settings.${key}`, settingLabel(key), found, settingHref(key));
  }
  for (const scene of site.scenes) {
    for (const found of placeholders(scene)) provisional(`scene.${scene.key}`, `la escena «${scene.name}»`, found, `/admin/textos?escena=${scene.key}`);
  }
  for (const page of Object.values(site.pages)) {
    for (const found of placeholders(page)) provisional(`page.${page.slug}`, `la página «${page.title}»`, found, "/admin/ajustes?tab=paginas");
  }
  for (const project of site.projects) {
    const href = `/admin/proyectos/${project.id}`;
    if (project.is_placeholder) {
      add({ id: `project-sample:${project.id}`, severity: "bloqueante", title: `Proyecto de ejemplo publicado: «${project.title}»`, detail: "Es un caso ficticio del diseño. Sustitúyelo por un trabajo real o despublícalo.", href });
    }
    for (const found of placeholders(project)) provisional(`project.${project.id}`, `el proyecto «${project.title}»`, found, href);
  }

  // Configurador: el aviso de precios de ejemplo
  const disclaimer = text(site.settings.configurator?.disclaimer);
  if (/sustituir|de ejemplo/i.test(disclaimer)) {
    add({ id: "configurator-disclaimer", severity: "bloqueante", title: "El configurador dice que los precios son de ejemplo", detail: `Aviso bajo el presupuesto: «${disclaimer}»`, href: settingHref("configurator") });
  }

  // Datos legales obligatorios
  const legal = site.settings.legal ?? {};
  for (const field of LEGAL_REQUIRED) {
    if (!text(legal[field])) {
      add({ id: `legal-empty:${field}`, severity: "bloqueante", title: `Falta un dato legal: ${FIELD_LABELS[field]}`, detail: "Sale en el aviso legal y en la política de privacidad.", href: settingHref("legal") });
    }
  }

  // Avisos
  for (const project of site.projects) {
    if (!project.cover_id) {
      add({ id: `project-cover:${project.id}`, severity: "aviso", title: `Proyecto sin portada: «${project.title}»`, detail: "En el listado y al compartirlo saldrá sin imagen.", href: `/admin/proyectos/${project.id}` });
    }
  }

  const hero = site.scenes.find((s) => s.key === "hero");
  if (hero && !hero.media_id && !hero.poster_id) {
    add({ id: "hero-showreel", severity: "aviso", title: "El Hero no tiene showreel", detail: "Falta el vídeo del showreel y su póster.", href: "/admin/textos?escena=hero" });
  }

  for (const slug of ["web", "audiovisual"]) {
    const page = site.pages[slug];
    if (!page) continue;
    const header = (page.blocks as { type?: string; image_media_id?: string | null; video_media_id?: string | null }[]).find((b) => b?.type === "cabecera");
    if (!header?.image_media_id && !header?.video_media_id) {
      add({ id: `page-header:${slug}`, severity: "aviso", title: `La cabecera de /${slug} no tiene imagen ni vídeo`, detail: `Página «${page.title}».`, href: "/admin/ajustes?tab=paginas" });
    }
  }

  const contact = site.settings.contact ?? {};
  for (const field of SOCIAL) {
    const value = text(contact[field]);
    if (!value || isPlaceholderValue(value) || isValidSocial(value)) continue;
    add({ id: `social:${field}`, severity: "aviso", title: `${FIELD_LABELS[field]} no parece un usuario ni una dirección`, detail: `«${value}». Escribe «@usuario» o la dirección del perfil.`, href: settingHref("contact") });
  }

  return [...issues.filter((i) => i.severity === "bloqueante"), ...issues.filter((i) => i.severity === "aviso")];
}
