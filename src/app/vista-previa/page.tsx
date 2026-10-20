import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requirePageUser } from "@/admin/auth";
import { loadDraftSnapshot } from "@/admin/data";
import { SiteShell } from "@/components/chrome/SiteShell";
import { PageMotion } from "@/motion/PageMotion";
import { HomeScenes } from "@/scenes/HomeScenes";
import { PreviewBar } from "./PreviewBar";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

/** La home con el BORRADOR (lo que se verá al publicar). Solo para el equipo. */
export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen-safe items-center justify-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Preparando la vista previa…</div>}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const user = await requirePageUser();
  if (!user.role) redirect("/admin");
  const site = await loadDraftSnapshot();

  return (
    <SiteShell site={site} banner={<PreviewBar />}>
      <PageMotion>
        <HomeScenes site={site} />
      </PageMotion>
    </SiteShell>
  );
}
