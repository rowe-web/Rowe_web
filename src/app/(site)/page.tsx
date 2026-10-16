import type { Metadata } from "next";
import { getSetting } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { HomeScenes } from "@/scenes/HomeScenes";

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite();
  const seo = getSetting(site, "seo", { title: "", description: "" });
  return {
    title: { absolute: seo.title || "ROWE — Estudio de web y audiovisual" },
    description: seo.description || undefined,
    alternates: { canonical: "/" },
  };
}

/**
 * Home: «la web como una película». Las escenas salen de la versión publicada,
 * en el orden y con la visibilidad que se decidan en el panel.
 */
export default async function Home() {
  const site = await loadSite();
  return <HomeScenes site={site} />;
}
