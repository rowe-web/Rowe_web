import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap construido desde NEXT_PUBLIC_SITE_URL.
 * Fase 1: páginas fijas. En la Fase 5 se añaden los proyectos publicados.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/web", priority: 0.8 },
    { path: "/audiovisual", priority: 0.8 },
    { path: "/proyectos", priority: 0.8 },
    { path: "/contacto", priority: 0.7 },
    { path: "/aviso-legal", priority: 0.1 },
    { path: "/privacidad", priority: 0.1 },
    { path: "/cookies", priority: 0.1 },
  ];
  return routes.map((r) => ({ url: absoluteUrl(r.path), changeFrequency: "monthly", priority: r.priority }));
}
