import type { Metadata } from "next";
import { LegalPage } from "@/components/scene/LegalPage";
import { loadSite } from "@/lib/content/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite();
  const page = site.pages["privacidad"];
  return { title: { absolute: page?.seo_title || "ROWE" }, alternates: { canonical: "/privacidad" } };
}

export default async function Page() {
  return <LegalPage site={await loadSite()} slug="privacidad" />;
}
