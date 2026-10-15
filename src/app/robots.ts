import type { MetadataRoute } from "next";
import { absoluteUrl, allowIndexing } from "@/lib/site";

/** robots.txt construido desde NEXT_PUBLIC_SITE_URL. Bloquea todo hasta el lanzamiento. */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sistema"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
