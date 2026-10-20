import { SiteShell } from "@/components/chrome/SiteShell";
import { loadSite } from "@/lib/content/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await loadSite();
  return <SiteShell site={site}>{children}</SiteShell>;
}
