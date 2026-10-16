import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requirePageUser } from "@/admin/auth";
import { SiteShell } from "@/components/chrome/SiteShell";
import type { SiteSnapshot } from "@/lib/content/types";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PageMotion } from "@/motion/PageMotion";
import { HomeScenes } from "@/scenes/HomeScenes";

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
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("build_snapshot");
  if (error || !data) throw new Error(`No se pudo preparar la vista previa: ${error?.message ?? "sin datos"}`);
  const site = { ...(data as Omit<SiteSnapshot, "version" | "published_at">), version: 0, published_at: new Date().toISOString() } as SiteSnapshot;

  return (
    <SiteShell site={site} banner={<PreviewBar />}>
      <PageMotion>
        <HomeScenes site={site} />
      </PageMotion>
    </SiteShell>
  );
}

function PreviewBar() {
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[700] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3 rounded-full border border-line-strong bg-[rgb(10_10_10/0.92)] py-2 pl-4 pr-2 backdrop-blur-md">
      <span className="h-2 w-2 flex-none animate-rec rounded-full bg-rec" aria-hidden="true" />
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-bone">Vista previa · borrador sin publicar</span>
      <Link href="/admin" className="flex h-8 flex-none items-center rounded-full bg-bone px-3.5 text-[12px] text-ink">
        Volver al panel
      </Link>
    </div>
  );
}
