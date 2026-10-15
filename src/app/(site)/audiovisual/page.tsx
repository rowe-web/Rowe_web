import type { Metadata } from "next";
import { ProvisionalPage } from "@/components/scene/ProvisionalPage";
import { loadSite } from "@/lib/content/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite();
  const page = site.pages["audiovisual"];
  return {
    title: { absolute: page?.seo_title || "Producción audiovisual — ROWE" },
    description: page?.seo_description || undefined,
    alternates: { canonical: "/audiovisual" },
  };
}

/** Provisional (Fase 2). Diseño definitivo en la Fase 5. */
export default async function Page() {
  const site = await loadSite();
  return <ProvisionalPage site={site} slug="audiovisual" scenes={["audiovisual", "ecosistema"]} />;
}
