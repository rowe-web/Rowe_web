import type { Metadata } from "next";
import { ProvisionalPage } from "@/components/scene/ProvisionalPage";
import { loadSite } from "@/lib/content/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite();
  const page = site.pages["proyectos"];
  return {
    title: { absolute: page?.seo_title || "Proyectos — ROWE" },
    description: page?.seo_description || undefined,
    alternates: { canonical: "/proyectos" },
  };
}

/** Provisional (Fase 2). Diseño definitivo en la Fase 5. */
export default async function Page() {
  const site = await loadSite();
  return <ProvisionalPage site={site} slug="proyectos" scenes={["proyectos", "filosofia"]} />;
}
