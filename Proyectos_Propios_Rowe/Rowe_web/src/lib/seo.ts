import type { Metadata } from "next";
import { emptyContact, emptyLegal, fillLegal, getSetting, hasRealValue, instagramHref, mediaUrl, serviceCities, type ContactSettings, type LegalSettings } from "@/lib/content/settings";
import type { Project, SiteSnapshot } from "@/lib/content/types";
import { plainText } from "@/lib/rich-text";
import { absoluteUrl, siteHost, siteUrl, supabaseConfig } from "@/lib/site";

/**
 * SEO a partir del contenido publicado y de NEXT_PUBLIC_SITE_URL:
 * título, descripción, canónica, Open Graph / Twitter y datos estructurados (JSON-LD).
 * El dominio nunca se escribe a mano: todas las URL salen de absoluteUrl().
 */

export const SITE_NAME = "ROWE";

/** Imagen para compartir por defecto (public/brand/og-default.png, 1200×630). */
export const DEFAULT_OG = { url: "/brand/og-default.png", width: 1200, height: 630, alt: "ROWE — Web & Audiovisual" };

interface SeoSettings {
  title: string;
  description: string;
  og_media_id: string | null;
}

export function seoSettings(site: SiteSnapshot): SeoSettings {
  return getSetting<SeoSettings>(site, "seo", { title: "", description: "", og_media_id: null });
}

/** Primera imagen disponible de la lista (de la página, del proyecto…); si no, la de Ajustes → SEO o la de marca. */
export function ogImage(site: SiteSnapshot, ...ids: (string | null | undefined)[]) {
  for (const id of [...ids, seoSettings(site).og_media_id]) {
    const m = id ? site.media[id] : null;
    if (m && m.kind === "image") {
      return { url: mediaUrl(supabaseConfig.url, m.bucket, m.path), width: m.width ?? undefined, height: m.height ?? undefined, alt: m.alt || undefined };
    }
  }
  return DEFAULT_OG;
}

interface MetaInput {
  title: string;
  description?: string;
  path: string;
  images?: (string | null | undefined)[];
  type?: "website" | "article";
}

export function buildMetadata(site: SiteSnapshot, { title, description, path, images = [], type = "website" }: MetaInput): Metadata {
  const t = plainText(title);
  const desc = plainText(description || seoSettings(site).description) || undefined;
  const image = ogImage(site, ...images);
  return {
    title: { absolute: t },
    description: desc,
    alternates: { canonical: path },
    openGraph: { type, locale: "es_ES", siteName: SITE_NAME, title: t, description: desc, url: path, images: [image] },
    twitter: { card: "summary_large_image", title: t, description: desc, images: [image.url] },
  };
}

/** Metadatos de una página interna (pages): título y descripción de Google del panel, con alternativas. */
export function pageMetadata(site: SiteSnapshot, slug: string, fallbackTitle: string): Metadata {
  const page = site.pages[slug];
  // Las entradillas legales llevan marcas ({dominio}…): se rellenan también aquí
  const fill = (t: string) => fillLegal(t, getSetting<LegalSettings>(site, "legal", emptyLegal), { url: siteUrl, host: siteHost });
  return buildMetadata(site, {
    title: page?.seo_title || (page ? `${plainText(page.title)} — ${SITE_NAME}` : fallbackTitle),
    description: fill(page?.seo_description || page?.intro || ""),
    path: `/${slug}`,
    images: [page?.og_media_id],
  });
}

// ---------------------------------------------------------------------------
// Datos estructurados
// ---------------------------------------------------------------------------

/** Un dato vacío o entre corchetes es provisional («[+34 600 000 000]»): no se publica en JSON-LD. */
const real = (v: string | undefined | null) => (hasRealValue(v) ? v : undefined);

/** Las webs se hacen para toda España. */
const SPAIN = { "@type": "Country", name: "España" } as const;

/** Rodajes: las ciudades de la zona (Ajustes → Contacto); sin ninguna, toda España. */
function videoAreaServed(site: SiteSnapshot) {
  const cities = serviceCities(getSetting<ContactSettings>(site, "contact", emptyContact));
  if (!cities.length) return SPAIN;
  return cities.map((name) => ({ "@type": "City", name, containedInPlace: { "@type": "AdministrativeArea", name: "Provincia de Tarragona" } }));
}

export function organizationLd(site: SiteSnapshot) {
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const seo = seoSettings(site);
  const sameAs = [
    instagramHref(contact.instagram),
    hasRealValue(contact.tiktok) ? `https://tiktok.com/${contact.tiktok.startsWith("@") ? contact.tiktok : `@${contact.tiktok}`}` : "",
    hasRealValue(contact.linkedin) ? `https://${contact.linkedin.replace(/^https?:\/\//, "")}` : "",
    hasRealValue(contact.youtube) ? `https://${contact.youtube.replace(/^https?:\/\//, "")}` : "",
  ].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/#organizacion`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/rowe-logo-negro.png"),
    image: absoluteUrl(DEFAULT_OG.url),
    description: plainText(seo.description) || undefined,
    email: real(contact.email_contact),
    telephone: real(contact.phone),
    address: real(contact.address) ? { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "ES" } : undefined,
    areaServed: SPAIN,
    knowsAbout: ["Diseño web", "Desarrollo web", "Producción audiovisual", "Vídeo para redes sociales", "Fotografía"],
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#web`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "es-ES",
    publisher: { "@id": `${siteUrl}/#organizacion` },
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Inicio", path: "/" }, ...trail].map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: plainText(t.name),
      item: absoluteUrl(t.path),
    })),
  };
}

export function serviceLd(site: SiteSnapshot, slug: string, discipline: "web" | "audiovisual") {
  const page = site.pages[slug];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: plainText(page?.title ?? slug),
    description: plainText(page?.seo_description || page?.intro || "") || undefined,
    url: absoluteUrl(`/${slug}`),
    areaServed: discipline === "audiovisual" ? videoAreaServed(site) : SPAIN,
    provider: { "@id": `${siteUrl}/#organizacion` },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: plainText(page?.title ?? slug),
      itemListElement: site.services
        .filter((s) => s.discipline === discipline)
        .map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.description } })),
    },
  };
}

export function projectLd(site: SiteSnapshot, p: Project) {
  const image = ogImage(site, p.cover_id).url;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.title,
    headline: p.title,
    abstract: p.summary || undefined,
    url: absoluteUrl(`/proyectos/${p.slug}`),
    image: image.startsWith("http") ? image : absoluteUrl(image),
    dateCreated: p.year ? String(p.year) : undefined,
    genre: p.category,
    about: p.sector || undefined,
    creator: { "@id": `${siteUrl}/#organizacion` },
    inLanguage: "es-ES",
  };
}
