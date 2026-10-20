import type { MetadataRoute } from "next";
import { loadSite } from "@/lib/content/site";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap construido desde NEXT_PUBLIC_SITE_URL y la versión publicada:
 * páginas fijas + un caso de estudio por proyecto publicado. Se renueva al publicar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await loadSite();
  const lastModified = site.published_at ? new Date(site.published_at) : undefined;
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/web", priority: 0.9 },
    { path: "/audiovisual", priority: 0.9 },
    { path: "/proyectos", priority: 0.8 },
    { path: "/contacto", priority: 0.7 },
    { path: "/aviso-legal", priority: 0.1 },
    { path: "/privacidad", priority: 0.1 },
    { path: "/cookies", priority: 0.1 },
  ];
  return [
    ...pages.map((r) => ({ url: absoluteUrl(r.path), lastModified, changeFrequency: "monthly" as const, priority: r.priority })),
    ...site.projects.map((p) => ({ url: absoluteUrl(`/proyectos/${p.slug}`), lastModified, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
