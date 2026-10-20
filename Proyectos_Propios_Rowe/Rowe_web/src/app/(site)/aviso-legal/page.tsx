import type { Metadata } from "next";
import { LegalPage } from "@/components/scene/LegalPage";
import { loadSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadSite(), "aviso-legal", "Aviso legal — ROWE");
}

export default async function Page() {
  return <LegalPage site={await loadSite()} slug="aviso-legal" />;
}
