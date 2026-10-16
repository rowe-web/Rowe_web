import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import type { SiteSnapshot } from "@/lib/content/types";
import { breadcrumbLd, serviceLd } from "@/lib/seo";
import { PageBlocks } from "./PageBlocks";

/** Página interna (web, audiovisual, proyectos, contacto): secciones del panel + datos estructurados. */
export function InternalPage({ site, slug }: { site: SiteSnapshot; slug: string }) {
  const page = site.pages[slug];
  if (!page) notFound();
  const ld: object[] = [breadcrumbLd([{ name: page.title, path: `/${slug}` }])];
  if (slug === "web" || slug === "audiovisual") ld.push(serviceLd(site, slug, slug));
  return (
    <>
      <JsonLd data={ld} />
      <PageBlocks page={page} site={site} />
    </>
  );
}
