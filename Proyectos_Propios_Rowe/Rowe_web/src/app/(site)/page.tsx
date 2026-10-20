import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { loadSite } from "@/lib/content/site";
import { buildMetadata, organizationLd, seoSettings, websiteLd } from "@/lib/seo";
import { HomeScenes } from "@/scenes/HomeScenes";

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite();
  const seo = seoSettings(site);
  return buildMetadata(site, { title: seo.title || "ROWE — Estudio de web y audiovisual", description: seo.description, path: "/" });
}

/**
 * Home: «la web como una película». Las escenas salen de la versión publicada,
 * en el orden y con la visibilidad que se decidan en el panel.
 */
export default async function Home() {
  const site = await loadSite();
  return (
    <>
      <JsonLd data={[organizationLd(site), websiteLd()]} />
      <HomeScenes site={site} />
    </>
  );
}
