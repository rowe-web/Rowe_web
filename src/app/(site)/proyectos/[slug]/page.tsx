import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Button } from "@/components/ui/Button";
import { loadSite } from "@/lib/content/site";
import { getMedia } from "@/scenes/types";

export async function generateStaticParams() {
  const site = await loadSite();
  return site.projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite();
  const p = site.projects.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: { absolute: p.seo_title || `${p.title} — ROWE` }, description: p.seo_description || p.summary, alternates: { canonical: `/proyectos/${p.slug}` } };
}

/** Detalle de proyecto PROVISIONAL (Fase 2): datos reales del panel; diseño definitivo en la Fase 5. */
export default function ProjectPage({ params }: PageProps<"/proyectos/[slug]">) {
  return (
    <Suspense fallback={<main className="min-h-screen-safe" />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/proyectos/[slug]">["params"] }) {
  const { slug } = await params;
  const site = await loadSite();
  const p = site.projects.find((x) => x.slug === slug);
  if (!p) notFound();
  // Textos de los botones: los mismos (editables) que la escena Proyectos
  const scene = site.scenes.find((s) => s.key === "proyectos");
  const allLabel = (scene?.data as { all_label?: string } | undefined)?.all_label ?? "Ver todos los proyectos";

  return (
    <main id="contenido" className="gutter-x pb-[14vh] pt-[clamp(120px,18vh,180px)]">
      <SceneHeader kicker={`Proyecto — ${p.category}`} meta={[p.sector, String(p.year ?? "")]} />
      <h1 data-reveal="mask" className="headline mt-12 text-[clamp(48px,12vw,72px)] md:mt-[9vh] md:text-[clamp(72px,9vw,140px)]">
        {p.title}
      </h1>
      <div data-reveal="wipe" className="mt-12">
        <MediaFrame media={getMedia(site, p.cover_id)} aspect="2.39 / 1" marks={24} placeholder={`[ Portada 2.39:1 · ${p.title} ]`} priority />
      </div>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {([["Reto", p.challenge], ["Solución", p.solution], ["Resultado", p.result]] as const).map(([label, text]) => (
          <div key={label} data-reveal className="flex flex-col gap-3 border-t border-line pt-5">
            <span className="label-mono text-muted">{label}</span>
            <p className="text-[17px] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <dl className="mt-14 grid grid-cols-3 border-y border-line">
        {p.metrics.map((m, i) => (
          <div key={m.label} className={`flex flex-col gap-2 py-6 ${i ? "border-l border-line pl-4 md:pl-8" : ""}`}>
            <dd className="headline-serif text-[clamp(32px,6vw,72px)] leading-none">{m.value}</dd>
            <dt className="label-mono text-[10px] text-muted">{m.label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-14 flex flex-wrap gap-6">
        <Button href={scene?.cta_href ? `/${scene.cta_href.replace(/^\//, "")}` : "/#hablemos"} arrow="→">
          {scene?.cta_label || "Hablemos"}
        </Button>
        <Button variant="link" href="/proyectos" arrow="→">
          {allLabel}
        </Button>
      </div>
    </main>
  );
}
