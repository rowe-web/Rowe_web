import type { Metadata } from "next";
import { InternalPage } from "@/components/page/InternalPage";
import { loadSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadSite(), "audiovisual", "Producción audiovisual — ROWE");
}

/** /audiovisual: secciones editables en Ajustes → Páginas y legal. */
export default async function Page() {
  return <InternalPage site={await loadSite()} slug="audiovisual" />;
}
