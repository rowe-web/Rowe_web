import type { Metadata } from "next";
import { LegalPage } from "@/components/scene/LegalPage";
import { loadSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadSite(), "privacidad", "Política de privacidad — ROWE");
}

export default async function Page() {
  return <LegalPage site={await loadSite()} slug="privacidad" />;
}
