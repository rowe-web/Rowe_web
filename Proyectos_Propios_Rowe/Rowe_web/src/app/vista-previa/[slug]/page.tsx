import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { requirePageUser } from "@/admin/auth";
import { loadDraftSnapshot } from "@/admin/data";
import { SiteShell } from "@/components/chrome/SiteShell";
import { LegalPage } from "@/components/scene/LegalPage";
import { PageMotion } from "@/motion/PageMotion";
import { PreviewBar } from "../PreviewBar";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

/** Páginas legales con vista previa del borrador. */
const LEGAL = ["aviso-legal", "privacidad", "cookies"];

export function generateStaticParams() {
  return LEGAL.map((slug) => ({ slug }));
}

/** Aviso legal, privacidad y cookies con el BORRADOR (lo que se verá al publicar). Solo para el equipo. */
export default async function LegalPreviewPage({ params }: PageProps<"/vista-previa/[slug]">) {
  const { slug } = await params;
  if (!LEGAL.includes(slug)) notFound();
  return (
    <Suspense fallback={<div className="flex min-h-screen-safe items-center justify-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Preparando la vista previa…</div>}>
      <Preview slug={slug} />
    </Suspense>
  );
}

async function Preview({ slug }: { slug: string }) {
  const user = await requirePageUser();
  if (!user.role) redirect("/admin");
  const site = await loadDraftSnapshot();

  return (
    <SiteShell site={site} banner={<PreviewBar />}>
      <PageMotion>
        <LegalPage site={site} slug={slug} />
      </PageMotion>
    </SiteShell>
  );
}
